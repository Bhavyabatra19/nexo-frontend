/**
 * Nexo Content Script — runs on all linkedin.com pages
 *
 * Three modes:
 * 1. Profile page (linkedin.com/in/*): passive DOM capture + inject Nexo button
 * 2. Connections page (/mynetwork/.../connections): MutationObserver scroll capture → batch sync
 * 3. Any page: SPA navigation watcher
 *
 * Design: DOM-reading only (same approach as Dex, Clay, Folk).
 * No cookie injection, no Voyager API calls.
 */

(function () {
  // Hoisted module constants — declared up-front so mountWidget() can run
  // synchronously at load time without hitting a TDZ on `const`s declared later.
  const WIDGET_HOST_ID = 'nexo-widget-host';
  const FRONTEND_URL = 'https://nexo-frontend-indol.vercel.app';

  console.log('[Nexo] content script loaded on', window.location.pathname);

  // Visual breadcrumb so we can tell at a glance whether the content script ran.
  // Auto-hides after 4s; clicking it removes it immediately.
  try {
    const b = document.createElement('div');
    b.textContent = 'Nexo loaded';
    b.style.cssText = 'all:initial;position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#6366f1;color:#fff;font:600 12px/1 system-ui;padding:6px 12px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.25);cursor:pointer;';
    b.addEventListener('click', () => b.remove());
    (document.body || document.documentElement).appendChild(b);
    setTimeout(() => b.remove(), 4000);
  } catch {}

  const isProfilePage     = () => window.location.pathname.startsWith('/in/');
  const isConnectionsPage = () => window.location.pathname.includes('/mynetwork/invite-connect/connections');

  if (isProfilePage()) {
    // Mount the widget immediately — don't gate on h1 since the widget renders
    // its own "loading / sign in" states before any profile scraping runs.
    mountWidget();
    waitForElement('h1', () => {
      captureCurrentProfile();
      injectNexoButton();
    });
  }

  if (isConnectionsPage()) {
    mountWidget();
  }

  // ── Selectors ─────────────────────────────────────────────────────────────
  // Multiple variants to survive LinkedIn's frequent CSS renames.

  const CONNECTION_CARD_SELECTORS = [
    'li.mn-connection-card',
    'li[class*="mn-connection-card"]',
    'li[class*="reusable-search__result-container"]',
    'li[class*="entity-result"]',
    'li[class*="scaffold-finite-scroll"]',
  ];

  const CONNECTION_LIST_SELECTORS = [
    '.mn-connections__list',
    '[class*="scaffold-finite-scroll__content"]',
    '[class*="search-results-container"]',
  ];

  function isConnectionCard(el) {
    return el.matches?.(CONNECTION_CARD_SELECTORS.join(', '));
  }

  function queryCards(root) {
    return [...root.querySelectorAll(CONNECTION_CARD_SELECTORS.join(', '))];
  }

  // ── Link-based anchor detection ────────────────────────────────────────────
  // LinkedIn renames classes and restructures the connections page often
  // enough that class selectors rot (Dec 2024 refactor broke Folk, Clay, Dex).
  // Anchor-based detection is the stable approach: scan all <a href="/in/..">
  // links, filter out chrome + overlays, and extract per-anchor.

  // Canonicalize any LinkedIn profile href (absolute OR relative) to
  // https://www.linkedin.com/in/<slug>. Returns null if the href isn't a
  // /in/<slug> link.
  function canonicalLinkedInUrl(href) {
    if (!href) return null;
    const m = href.match(/\/in\/([^/?#]+)/);
    return m ? `https://www.linkedin.com/in/${m[1]}` : null;
  }

  // Profile sub-paths are always navigation within a profile page (almost
  // always the viewer's own profile shown in a sidebar/top card). Strip them.
  const PROFILE_SUBPATH_RE =
    /\/in\/[^/]+\/(overlay|messaging|edit|opportunities|details|detail|mutual|recent-activity|overview|skills|activity)(\/|$|\?)/;

  function findProfileAnchors(root = document) {
    const scope = root instanceof Element || root instanceof Document ? root : document;
    return [...scope.querySelectorAll('a[href*="/in/"]')].filter(a => {
      const href = a.getAttribute('href') || '';
      if (!canonicalLinkedInUrl(href)) return false;
      // Reject profile sub-pages — these are always internal navigation, not
      // a "save this contact" target. Your own profile card contributes 50+
      // of these on the connections page's top widget.
      if (PROFILE_SUBPATH_RE.test(href)) return false;
      if (a.closest('#global-nav')) return false;
      if (a.closest('[data-control-name="identity_welcome_message"]')) return false;
      return true;
    });
  }

  // Walk up from the anchor to find the "card-sized" container — the ancestor
  // that holds the full connection entry (avatar + name + headline). Needed
  // because LinkedIn's 2024+ connections page uses obfuscated-class <div>
  // nesting with no <li> wrapper.
  function findCardContainer(anchor) {
    let el = anchor;
    for (let i = 0; i < 8; i++) {
      el = el.parentElement;
      if (!el || el === document.body) break;
      // A card contains multiple elements (avatar, name, subtitle, actions)
      // and has enough vertical size to be a row rather than inline text.
      if (el.children.length >= 2 && el.offsetHeight >= 40) {
        return el;
      }
    }
    return anchor.parentElement?.parentElement || anchor.parentElement;
  }

  function extractFromAnchor(anchor) {
    const href = anchor.getAttribute('href') || '';
    const linkedin_url = canonicalLinkedInUrl(href);
    if (!linkedin_url) return null;

    const card =
      anchor.closest('li') ||
      anchor.closest('[data-view-name]') ||
      anchor.closest('[componentkey]') ||
      anchor.closest('div[class*="card"]') ||
      findCardContainer(anchor);

    // LinkedIn's pattern: visible text lives in <span aria-hidden="true">
    // (paired with visually-hidden SR-only siblings). Collect all of them —
    // that gives us a class-free list of the card's text.
    const textSpans = card
      ? [...card.querySelectorAll('span[aria-hidden="true"]')]
          .map(s => (s.innerText || '').trim())
          .filter(Boolean)
      : [];

    // Name: aria-label on the anchor is most stable.
    const name =
      parseAriaLabel(anchor.getAttribute('aria-label')) ||
      textSpans[0] ||
      (anchor.innerText || '').trim().split('\n').map(s => s.trim()).find(Boolean) ||
      null;
    if (!name) return null;

    // Headline: first text span that isn't the name, isn't a button label,
    // isn't the connected-date line, and is a reasonable length.
    const headline = textSpans.find(t =>
      t !== name &&
      t.length > 4 && t.length < 250 &&
      !/^(message|follow|connect|pending|remove|more|view\s)/i.test(t) &&
      !/^connected/i.test(t) &&
      !/^\d+(st|nd|rd)\s+degree/i.test(t)
    ) || null;

    // Connected date: LinkedIn shows "Connected MMM YYYY" (e.g. "Connected Mar 2024")
    // or "Connected on Mar 12, 2024". Scan all card text.
    let connectedText = textSpans.find(t => /connected/i.test(t));
    if (!connectedText && card) {
      // Fallback: any element in the card whose text starts with "Connected".
      for (const el of card.querySelectorAll('time, span, div')) {
        const t = (el.innerText || '').trim();
        if (/^connected/i.test(t)) { connectedText = t; break; }
      }
    }
    const connected_at = parseConnectedDate(connectedText);

    // Company: parse "Title at Company" from headline.
    const companyMatch = headline?.match(/\bat\s+(.+?)(?:\s*[·•|]\s*|$)/i);
    const company = companyMatch ? companyMatch[1].trim() : null;

    const profile_pic = card ? (
      qAttr(card, 'img[src*="licdn.com"]:not([src*="ghost"])', 'src') ||
      qAttr(card, 'img[src*="media.licdn.com"]', 'src') ||
      null
    ) : null;

    return {
      linkedin_url,
      name,
      headline,
      company,
      connected_at,
      profile_pic,
      connection_degree: 1,
      captured_at:       new Date().toISOString(),
    };
  }

  // Parse LinkedIn's "Connected MMM YYYY" / "Connected on DATE" / "Nd ago"
  // strings into an ISO date string. Returns null if unparseable.
  function parseConnectedDate(text) {
    if (!text) return null;
    const cleaned = text.replace(/^connected\s*(on\s*)?/i, '').trim();

    // "Mar 2024" / "March 12, 2024" / "Mar 12, 2024"
    const m1 = cleaned.match(/([A-Za-z]+)\s+(?:(\d{1,2}),?\s+)?(\d{4})/);
    if (m1) {
      const d = new Date(`${m1[1]} ${m1[2] || '1'}, ${m1[3]}`);
      if (!isNaN(d)) return d.toISOString();
    }

    // "3d ago" / "2 weeks ago" / "1 month ago" / "2 years ago"
    const m2 = cleaned.match(/(\d+)\s*(d|day|w|week|mo|month|y|year|h|hour)s?\s*ago/i);
    if (m2) {
      const n = parseInt(m2[1], 10);
      const unit = m2[2].toLowerCase();
      const d = new Date();
      if (unit.startsWith('h')) d.setHours(d.getHours() - n);
      else if (unit.startsWith('d')) d.setDate(d.getDate() - n);
      else if (unit.startsWith('w')) d.setDate(d.getDate() - n * 7);
      else if (unit.startsWith('mo') || unit === 'm') d.setMonth(d.getMonth() - n);
      else if (unit.startsWith('y')) d.setFullYear(d.getFullYear() - n);
      return d.toISOString();
    }

    return null;
  }

  // ── Connections Page: Explicit Checkbox Selection ──────────────────────────
  // Folk-style pattern: every detected connection card gets a checkbox injected.
  // Default: all cards checked. User unticks ones they don't want, then clicks
  // Import in the widget. We send batches of up to 50 per Import click.

  const SELECTED_ATTR = 'data-nexo-linkedin-url';

  function initConnectionsSelection() {
    if (window.__nexoSelectionActive) return window.__nexoSelection;
    window.__nexoSelectionActive = true;
    window.__nexoSelection = window.__nexoSelection || new Map();   // linkedin_url → profile
    window.__nexoCardBoxes = window.__nexoCardBoxes || new Map();   // linkedin_url → checkbox element
    injectStyles(); // ensure .nexo-cb-wrap styles are present
    console.log('[Nexo] selection: initialized');

    const emit = () => {
      const detail = { count: window.__nexoSelection.size };
      window.dispatchEvent(new CustomEvent('nexo-selection-change', { detail }));
    };

    function injectCheckboxFor(anchor) {
      const profile = extractFromAnchor(anchor);
      if (!profile) return;
      const url = profile.linkedin_url;

      // Use the same card-container heuristic as the extractor.
      const card =
        anchor.closest('li') ||
        anchor.closest('[componentkey]') ||
        anchor.closest('[data-view-name]') ||
        anchor.closest('div[class*="card"]') ||
        findCardContainer(anchor);
      if (!card) return;

      // Skip if we've already put a checkbox on this card for this URL.
      if (card.querySelector(`.nexo-cb-wrap[${SELECTED_ATTR}="${CSS.escape(url)}"]`)) return;
      // Skip if a different checkbox already claims this card (prevents
      // decorating avatar-anchor AND name-anchor as two separate cards).
      if (card.querySelector('.nexo-cb-wrap')) return;

      // Update profile data in case later anchors carry richer metadata.
      window.__nexoSelection.set(url, profile);

      // Ensure absolute-positioned checkbox anchors to this card.
      const cs = getComputedStyle(card);
      if (cs.position === 'static') card.style.position = 'relative';

      const wrap = document.createElement('label');
      wrap.className = 'nexo-cb-wrap nexo-selected';
      wrap.setAttribute(SELECTED_ATTR, url);

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = true;  // Default: all selected
      cb.className = 'nexo-cb';

      const txt = document.createElement('span');
      txt.textContent = 'Nexo';

      wrap.append(cb, txt);

      // Stop clicks bubbling to LinkedIn's own card link.
      wrap.addEventListener('click', (e) => e.stopPropagation());
      cb.addEventListener('change', () => {
        if (cb.checked) {
          window.__nexoSelection.set(url, profile);
          wrap.classList.add('nexo-selected');
        } else {
          window.__nexoSelection.delete(url);
          wrap.classList.remove('nexo-selected');
        }
        emit();
      });

      card.appendChild(wrap);
      window.__nexoCardBoxes.set(url, cb);
      emit();
    }

    function sweep(root = document) {
      findProfileAnchors(root).forEach(injectCheckboxFor);
    }

    // MutationObserver for lazy-loaded cards
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!(node instanceof Element)) continue;
          sweep(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Diagnostic — inspectable on demand via window.__nexoDiag() or the Rescan
    // button in the widget. Each line logs a single scalar so nothing collapses.
    window.__nexoDiag = function runDiag() {
      const rawAll = [...document.querySelectorAll('a[href*="/in/"]')];
      const filtered = findProfileAnchors(document);
      console.log('[Nexo] diag: url=' + location.href);
      console.log('[Nexo] diag: raw_in_anchors=' + rawAll.length);
      console.log('[Nexo] diag: filtered_anchors=' + filtered.length);
      console.log('[Nexo] diag: total_links=' + document.querySelectorAll('a[href]').length);
      console.log('[Nexo] diag: li_count=' + document.querySelectorAll('li').length);
      console.log('[Nexo] diag: main_present=' + !!document.querySelector('main'));
      console.log('[Nexo] diag: sample_raw_hrefs=' + JSON.stringify(rawAll.slice(0, 10).map(a => a.getAttribute('href'))));
      const altHrefs = [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href') || '')
        .filter(h => h && (h.includes('profile') || h.includes('member') || h.includes('people')))
        .slice(0, 10);
      console.log('[Nexo] diag: profile-like_hrefs=' + JSON.stringify(altHrefs));
      const connEls = document.querySelectorAll('[class*="connection"], [class*="mn-connection"]');
      console.log('[Nexo] diag: connection-classed_elements=' + connEls.length);
      if (connEls[0]) console.log('[Nexo] diag: first_connection_class=' + String(connEls[0].className).slice(0, 200));
      if (rawAll[0]) {
        const chain = [];
        let el = rawAll[0];
        for (let i = 0; i < 6 && el; i++) {
          chain.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className ? '.' + String(el.className).split(/\s+/).slice(0,2).join('.') : ''}`);
          el = el.parentElement;
        }
        console.log('[Nexo] diag: first_anchor_ancestors=' + chain.join(' > '));
      }
      return { rawAll: rawAll.length, filtered: filtered.length };
    };
    window.__nexoDiag();

    // Periodic re-log for 30s so we see how the page state evolves as
    // LinkedIn lazy-loads the connections list.
    const diagInterval = setInterval(() => {
      const raw = document.querySelectorAll('a[href*="/in/"]').length;
      const filt = findProfileAnchors(document).length;
      console.log('[Nexo] diag@' + new Date().toISOString().slice(11,19)
                  + ': raw=' + raw + ' filtered=' + filt
                  + ' selected=' + window.__nexoSelection.size);
    }, 3000);
    setTimeout(() => clearInterval(diagInterval), 30000);

    // Initial sweep + poll safety net
    sweep(document);
    console.log('[Nexo] selection: after initial sweep, count=', window.__nexoSelection.size);

    const pollTimer = setInterval(() => {
      const before = window.__nexoSelection.size;
      sweep(document);
      if (window.__nexoSelection.size !== before) {
        console.log('[Nexo] selection: poll +' + (window.__nexoSelection.size - before) + ', total=' + window.__nexoSelection.size);
      }
    }, 1000);

    function teardown() {
      observer.disconnect();
      clearInterval(pollTimer);
      window.__nexoSelectionActive = false;
      // Remove injected checkboxes
      document.querySelectorAll('.nexo-cb-wrap').forEach(el => el.remove());
      window.__nexoSelection.clear();
      window.__nexoCardBoxes.clear();
      emit();
    }

    window.__nexoSelectionController = { teardown, emit, rescan: () => sweep(document) };
    return window.__nexoSelection;
  }

  // Import up to 50 currently-selected contacts. On success, remove them from
  // the selection + uncheck their boxes. Returns { imported, remaining }.
  async function importSelectedBatch(max = 50) {
    const selection = window.__nexoSelection || new Map();
    const entries = [...selection.entries()].slice(0, max);
    if (!entries.length) return { ok: false, reason: 'empty' };

    const batch = entries.map(([, profile]) => profile);
    console.log('[Nexo] selection: importing batch of', batch.length);

    return new Promise((resolve) => {
      sendWithRetry(
        { type: 'CONNECTIONS_BATCH', data: batch, total: selection.size },
        2,
        (res) => {
          console.log('[Nexo] selection: batch response', res);
          if (res?.success && res.result?.result) {
            const r = res.result.result;
            const imported = (r.created || 0) + (r.updated || 0);
            // Remove imported entries from state and disable their checkboxes
            for (const [url] of entries) {
              selection.delete(url);
              const cb = window.__nexoCardBoxes?.get(url);
              if (cb) {
                cb.checked = false;
                cb.disabled = true;
                const wrap = cb.closest('.nexo-cb-wrap');
                if (wrap) {
                  wrap.classList.remove('nexo-selected');
                  wrap.classList.add('nexo-imported');
                  wrap.querySelector('span').textContent = '✓ Imported';
                }
              }
              window.__nexoCardBoxes.delete(url);
            }
            window.__nexoSelectionController?.emit?.();
            resolve({ ok: true, imported, remaining: selection.size });
          } else {
            resolve({ ok: false, error: res?.error || 'import failed' });
          }
        }
      );
    });
  }

  // ── Card Extraction ────────────────────────────────────────────────────────
  // Tries multiple selector strategies for each field to handle LinkedIn
  // layout changes. Returns null if no usable linkedin_url or name found.

  function extractConnectionCard(card) {
    // Primary /in/ link — skip overlay, messaging, mutual-connection links
    const link = [...card.querySelectorAll('a[href]')].find(a => {
      const href = a.getAttribute('href') || '';
      return /^\/in\/[^/?#]/.test(href) &&
             !href.includes('/overlay/') &&
             !href.includes('/messaging/') &&
             !href.includes('/search/');
    });
    if (!link) return null;

    const rawPath    = link.getAttribute('href').split('?')[0].replace(/\/$/, '');
    const linkedin_url = `https://www.linkedin.com${rawPath}`;

    // Name — ordered from most specific to most generic
    const name =
      // Modern layout: mn-connection-card__name
      qText(card, '.mn-connection-card__name') ||
      qText(card, '[class*="connection-card__name"]') ||
      // Search/entity-result layout
      qText(card, '.entity-result__title-text > span[aria-hidden="true"]') ||
      qText(card, '[class*="entity-result__title-text"] span[aria-hidden="true"]') ||
      qText(card, '[class*="entity-result__title-line"] span[aria-hidden="true"]') ||
      // Generic: first visible span inside h3
      qText(card, 'h3 span[aria-hidden="true"]') ||
      qText(card, 'h3 > span:not(.visually-hidden)') ||
      // aria-label fallback: "View John Doe's profile" or just "John Doe"
      parseAriaLabel(link.getAttribute('aria-label')) ||
      null;

    if (!name) return null;

    const headline =
      qText(card, '.mn-connection-card__occupation') ||
      qText(card, '[class*="connection-card__occupation"]') ||
      qText(card, '.entity-result__primary-subtitle') ||
      qText(card, '[class*="entity-result__primary-subtitle"]') ||
      qText(card, '.t-14.t-black--light.t-normal') ||
      null;

    // Profile pic — prefer ghost-free CDN URLs
    const profile_pic =
      qAttr(card, 'img[src*="licdn.com"]:not([src*="ghost"])', 'src') ||
      qAttr(card, 'img[src*="media.licdn.com"]', 'src') ||
      qAttr(card, 'img[src*="linkedin.com"]', 'src') ||
      null;

    return {
      linkedin_url,
      name,
      headline,
      company:           null,   // extracted server-side from headline
      profile_pic,
      connection_degree: 1,
      captured_at:       new Date().toISOString(),
    };
  }

  function parseAriaLabel(label) {
    if (!label) return null;
    // "View John Doe's profile" → "John Doe"
    // "John Doe's profile" → "John Doe"
    // "John Doe" → "John Doe"
    return label
      .replace(/^View\s+/i, '')
      .replace(/['']s\s+profile$/i, '')
      .replace(/\s+profile$/i, '')
      .trim() || null;
  }

  // ── Profile Page Capture ───────────────────────────────────────────────────

  function captureCurrentProfile() {
    const profile = extractProfileFromDOM();
    if (!profile.name) return;
    sendWithRetry({ type: 'PROFILE_CAPTURED', data: profile }, 3);

    // Deferred rich capture: experience/education sections load async via XHR.
    // Wait for any of them to appear in the DOM, then re-capture and update.
    waitForRichSections(() => {
      const bio        = extractAbout();
      const experience = extractExperience();
      const education  = extractEducation();
      const skills     = extractSkills();
      if (bio || experience.length || education.length || skills.length) {
        sendWithRetry({
          type: 'PROFILE_CAPTURED',
          data: { ...profile, bio, experience, education, skills },
        }, 2);
      }
    });
  }

  function waitForRichSections(callback, maxWait = 9000) {
    const RICH_SELECTOR =
      '#experience, [data-view-name*="experience-section"], ' +
      '#education,  [data-view-name*="education-section"]';

    if (document.querySelector(RICH_SELECTOR)) {
      setTimeout(callback, 400);
      return;
    }

    const observer = new MutationObserver(() => {
      if (document.querySelector(RICH_SELECTOR)) {
        observer.disconnect();
        setTimeout(callback, 400);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); callback(); }, maxWait);
  }

  function extractProfileFromDOM() {
    const cleanUrl = window.location.href.split('?')[0].replace(/\/$/, '');

    // Name — document.title is the most stable source across LinkedIn's frequent
    // class renames. Format is always "Name (N) | LinkedIn" or "Name | LinkedIn".
    const titleName = (() => {
      const t = document.title
        .replace(/^\(\d+\)\s*/, '')                    // strip unread-count "(3) "
        .replace(/\s*\|\s*LinkedIn\s*$/i, '')
        .trim();
      return t && t.toLowerCase() !== 'linkedin' ? t : null;
    })();

    const name =
      text('main h1') ||
      text('.text-heading-xlarge') ||
      [...document.querySelectorAll('h1')]
        .map(h => (h.innerText || '').trim())
        .find(t => t && t.length > 0 && t.length < 80) ||
      titleName;

    // Structural helpers — LinkedIn renames its classes often, so walk the
    // DOM relative to the h1 instead of depending solely on class selectors.
    const h1El = document.querySelector('main h1') ||
                 document.querySelector('.text-heading-xlarge') ||
                 document.querySelector('h1');

    const topCard = h1El
      ? (h1El.closest('.pv-text-details__left-panel') ||
         h1El.closest('section')                       ||
         h1El.parentElement?.parentElement)
      : null;

    // Collect leaf text elements under the top card, excluding the name itself
    // and any button/link/footer fluff.
    const cardLeaves = topCard
      ? [...topCard.querySelectorAll('div, span')]
          .filter(el => el.children.length === 0)
          .map(el => (el.innerText || '').trim())
          .filter(t => t && t.length < 200 && t !== name &&
                       !/^\d+\s*(followers?|connections?|mutual)/i.test(t) &&
                       !/^(see more|show all|message|connect|follow)$/i.test(t))
      : [];

    // Headline — class chain first, then: first non-trivial leaf under the top
    // card that isn't a location string.
    const headline =
      text('main .text-body-medium.break-words') ||
      text('.text-body-medium.break-words') ||
      text('div[data-field="headline"]') ||
      text('main div.text-body-medium') ||
      cardLeaves.find(t => t.length > 10 && !/,\s*[A-Z]/.test(t)) ||
      null;

    // Location — class chain first, then: a leaf that looks like "City, State"
    // or "City, Country" (has a comma followed by capitalized word).
    const location =
      text('.text-body-small.inline.t-black--light.break-words') ||
      text('main span.text-body-small.inline.t-black--light') ||
      text('.pv-text-details__left-panel .text-body-small') ||
      text('main .pv-text-details__left-panel span.text-body-small') ||
      cardLeaves.find(t => /,\s*[A-Z]/.test(t) && t.length < 120) ||
      null;

    // Profile pic — prefer img whose alt matches the extracted name (very stable
    // since alt-text is set for a11y), then fall back to known class patterns.
    const picByAlt = name
      ? document.querySelector(`main img[alt="${CSS.escape(name)}"]`) ||
        document.querySelector(`img[alt="${CSS.escape(name)}"]`)
      : null;

    // Company — first, try to parse "Title at Company" out of the (now more
    // robust) headline; then fall back to existing selector-based heuristic.
    const companyFromHeadline = headline?.match(/\bat\s+(.+?)(?:\s*[·•|]\s*|$)/i)?.[1]?.trim();

    const profile = {
      linkedin_url:      cleanUrl,
      name,
      headline,
      company:           companyFromHeadline || extractCurrentCompany(),
      location,
      profile_pic:       picByAlt?.getAttribute('src') ||
                         attr('img.pv-top-card-profile-picture__image--photo', 'src') ||
                         attr('img.profile-photo-edit__preview', 'src') ||
                         attr('.pv-top-card__photo img', 'src') ||
                         attr('main img[class*="profile-picture"]', 'src'),
      connection_degree: extractConnectionDegree(),
      captured_at:       new Date().toISOString(),
    };

    // Surface extraction coverage so bit-rot is easy to spot next time.
    console.log('[Nexo] extract:', {
      name: !!profile.name, headline: !!profile.headline,
      company: !!profile.company, location: !!profile.location,
      profile_pic: !!profile.profile_pic,
    });
    return profile;
  }

  // ── Rich Profile Data Extraction ─────────────────────────────────────────
  // These run after experience/education sections have loaded in the DOM.
  // Multiple selector strategies survive LinkedIn's frequent CSS renames.

  function extractAbout() {
    // Strategy 1: anchor id="about" — walk siblings for span text
    const anchor = document.querySelector('div#about, section#about');
    if (anchor) {
      let sibling = anchor.nextElementSibling;
      for (let i = 0; i < 6 && sibling; i++) {
        const spans = [...sibling.querySelectorAll('span[aria-hidden="true"]')]
          .filter(s => !s.closest('button') && (s.innerText || '').trim().length > 40);
        if (spans.length) return spans[0].innerText.trim();
        sibling = sibling.nextElementSibling;
      }
    }

    // Strategy 2: h2 labelled "About" inside any section
    for (const h2 of document.querySelectorAll('h2')) {
      if ((h2.innerText || '').trim().toLowerCase() === 'about') {
        const section = h2.closest('section') || h2.closest('div[class*="card"]');
        const span = section?.querySelector('.inline-show-more-text span[aria-hidden="true"]') ||
                     section?.querySelector('span[aria-hidden="true"]');
        const t = (span?.innerText || '').trim();
        if (t.length > 40) return t;
      }
    }

    // Strategy 3: data-view-name attr (newer builds)
    const aboutDiv = document.querySelector('[data-view-name*="about"]');
    if (aboutDiv) {
      const span = aboutDiv.querySelector('span[aria-hidden="true"]');
      const t = (span?.innerText || '').trim();
      if (t.length > 40) return t;
    }

    return null;
  }

  function extractExperience() {
    const items = querySectionItems('experience');
    return items.map(li => {
      // Detect grouped (multiple roles at one company) vs single-role entry
      const subItems = li.querySelectorAll('.pvs-list__item--one-column .pvs-entity');
      if (subItems.length > 1) {
        // Grouped: first bold = company, sub-items = individual roles
        const company = qTextFirst(li, '.t-bold span[aria-hidden="true"]');
        return [...subItems].map(sub => ({
          title:   qTextFirst(sub, '.t-bold span[aria-hidden="true"]'),
          company,
          dates:   qTextFirst(sub, '.pvs-entity__caption-wrapper span[aria-hidden="true"]') ||
                   qTextFirst(sub, '.t-14.t-normal.t-black--light span[aria-hidden="true"]'),
          current: isCurrentRole(sub),
        })).filter(r => r.title);
      }

      // Single-role entry
      const bolds = [...li.querySelectorAll('.t-bold span[aria-hidden="true"], .mr1.t-bold span[aria-hidden="true"]')]
        .map(s => (s.innerText || '').trim()).filter(Boolean);

      return [{
        title:   bolds[0] || null,
        company: bolds[1] ||
                 qTextFirst(li, '.t-14.t-normal:not(.t-black--light) span[aria-hidden="true"]'),
        dates:   qTextFirst(li, '.pvs-entity__caption-wrapper span[aria-hidden="true"]') ||
                 qTextFirst(li, '.t-14.t-normal.t-black--light span[aria-hidden="true"]'),
        current: isCurrentRole(li),
      }];
    }).flat().filter(r => r.title);
  }

  function extractEducation() {
    const items = querySectionItems('education');
    return items.map(li => {
      const bolds = [...li.querySelectorAll('.t-bold span[aria-hidden="true"]')]
        .map(s => (s.innerText || '').trim()).filter(Boolean);
      return {
        school: bolds[0] || null,
        degree: qTextFirst(li, '.t-14.t-normal:not(.t-black--light) span[aria-hidden="true"]'),
        dates:  qTextFirst(li, '.pvs-entity__caption-wrapper span[aria-hidden="true"]') ||
                qTextFirst(li, '.t-14.t-normal.t-black--light span[aria-hidden="true"]'),
      };
    }).filter(e => e.school);
  }

  function extractSkills() {
    const items = querySectionItems('skills');
    return items
      .map(li => qTextFirst(li, '.t-bold span[aria-hidden="true"]'))
      .filter(Boolean)
      .slice(0, 30); // cap at 30 skills
  }

  // Find the content list for a named profile section (experience/education/skills).
  // Returns array of <li> elements.
  function querySectionItems(sectionName) {
    // Strategy 1: anchor id (most reliable)
    const anchor = document.querySelector(`div#${sectionName}, section#${sectionName}`);
    if (anchor) {
      // Walk next siblings to find the ul
      let el = anchor.nextElementSibling;
      for (let i = 0; i < 8 && el; i++) {
        const lis = el.querySelectorAll('li.artdeco-list__item, li[class*="pvs-list__item"]');
        if (lis.length) return [...lis];
        el = el.nextElementSibling;
      }
    }

    // Strategy 2: data-view-name attribute
    const byViewName = document.querySelector(`[data-view-name*="${sectionName}"]`);
    if (byViewName) {
      const lis = byViewName.querySelectorAll('li.artdeco-list__item, li[class*="pvs-list__item"]');
      if (lis.length) return [...lis];
    }

    // Strategy 3: find section by h2 text match
    for (const h2 of document.querySelectorAll('h2')) {
      if ((h2.innerText || '').trim().toLowerCase().includes(sectionName)) {
        const section = h2.closest('section') || h2.parentElement?.parentElement;
        if (section) {
          const lis = section.querySelectorAll('li.artdeco-list__item, li[class*="pvs-list__item"]');
          if (lis.length) return [...lis];
        }
      }
    }

    return [];
  }

  function isCurrentRole(el) {
    const dateText = (
      qTextFirst(el, '.pvs-entity__caption-wrapper span[aria-hidden="true"]') ||
      qTextFirst(el, '.t-14.t-normal.t-black--light span[aria-hidden="true"]') || ''
    ).toLowerCase();
    return dateText.includes('present') || dateText.includes('current');
  }

  function qTextFirst(root, selector) {
    return (root.querySelector(selector)?.innerText || '').trim() || null;
  }

  function extractCurrentCompany() {
    const expEntry = document.querySelector(
      '#experience ~ div li:first-child .t-14.t-normal, ' +
      'section[id*="experience"] li:first-child .t-14.t-normal'
    );
    if (expEntry) return expEntry.innerText?.trim() || null;

    const aboutCompany = document.querySelector('span[aria-label*="Current company"]');
    if (aboutCompany) return aboutCompany.innerText?.trim() || null;

    const headline = text('.text-body-medium.break-words');
    if (headline) {
      const match = headline.match(/\bat\s+(.+)$/i);
      if (match) return match[1].trim();
    }
    return null;
  }

  function extractConnectionDegree() {
    const degreeEl = document.querySelector('span.dist-value');
    if (!degreeEl) return null;
    const t = degreeEl.innerText?.trim();
    if (t === '1st') return 1;
    if (t === '2nd') return 2;
    if (t === '3rd') return 3;
    return null;
  }

  // ── Nexo Button (profile pages) ────────────────────────────────────────────

  function injectNexoButton() {
    if (document.getElementById('nexo-save-btn')) return;

    const actionBar = document.querySelector(
      '.pvs-profile-actions, .pv-top-card-v2-ctas, ' +
      '[class*="profile-actions"], [class*="pv-top-card__cta"]'
    );
    if (!actionBar) {
      setTimeout(injectNexoButton, 1500);
      return;
    }

    const btn = document.createElement('button');
    btn.id = 'nexo-save-btn';
    btn.className = 'nexo-btn';
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
      Save to Nexo
    `;

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.disabled = true;
      btn.innerHTML = '<span class="nexo-spinner"></span> Saving…';

      sendWithRetry({ type: 'PROFILE_CAPTURED', data: extractProfileFromDOM() }, 2, (res) => {
        if (res?.success) {
          btn.innerHTML = '✓ Saved';
          btn.style.background = '#22c55e';
        } else {
          btn.innerHTML = '✗ Error';
          btn.style.background = '#ef4444';
        }
        setTimeout(() => {
          btn.innerHTML = 'Save to Nexo';
          btn.disabled = false;
          btn.style.background = '';
        }, 2000);
      });
    });

    actionBar.prepend(btn);
    injectStyles();
  }

  // ── sendMessage with retry ─────────────────────────────────────────────────
  // Chrome's background service worker can be suspended; retry up to maxAttempts.

  function sendWithRetry(message, maxAttempts, onDone) {
    let attempts = 0;

    function attempt() {
      attempts++;
      chrome.runtime.sendMessage(message, (res) => {
        if (chrome.runtime.lastError) {
          if (attempts < maxAttempts) {
            setTimeout(attempt, 500 * attempts);
          } else {
            console.warn('[Nexo] sendMessage failed after retries:', chrome.runtime.lastError.message);
            onDone?.(null);
          }
          return;
        }
        onDone?.(res);
      });
    }

    attempt();
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('nexo-styles')) return;
    const style = document.createElement('style');
    style.id = 'nexo-styles';
    style.textContent = `
      .nexo-btn {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 6px 16px; background: #6366f1; color: #fff;
        border: none; border-radius: 20px; font-size: 14px;
        font-weight: 600; cursor: pointer; transition: background 0.2s;
        margin-right: 8px; height: 32px; white-space: nowrap;
      }
      .nexo-btn:hover { background: #4f46e5; }
      .nexo-btn:disabled { opacity: 0.7; cursor: not-allowed; }
      .nexo-spinner {
        width: 12px; height: 12px;
        border: 2px solid rgba(255,255,255,0.4);
        border-top-color: #fff; border-radius: 50%;
        display: inline-block;
        animation: nexo-spin 0.6s linear infinite;
      }
      @keyframes nexo-spin { to { transform: rotate(360deg); } }

      .nexo-cb-wrap {
        position: absolute; top: 8px; right: 8px; z-index: 100;
        display: inline-flex; align-items: center; gap: 6px;
        padding: 4px 8px; background: rgba(255,255,255,0.96);
        border: 1.5px solid #e5e7eb; border-radius: 8px;
        font: 600 11px/1 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: #64748b; cursor: pointer; user-select: none;
        box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        transition: all 0.15s ease;
      }
      .nexo-cb-wrap:hover { border-color: #6366f1; color: #6366f1; }
      .nexo-cb-wrap.nexo-selected {
        background: #eef2ff; border-color: #6366f1; color: #4338ca;
      }
      .nexo-cb-wrap.nexo-imported {
        background: #dcfce7; border-color: #22c55e; color: #166534; cursor: default;
      }
      .nexo-cb-wrap input[type="checkbox"] {
        margin: 0; width: 14px; height: 14px; accent-color: #6366f1; cursor: pointer;
      }
      .nexo-cb-wrap.nexo-imported input[type="checkbox"] { accent-color: #22c55e; }
    `;
    document.head.appendChild(style);
  }

  // ── DOM Helpers ────────────────────────────────────────────────────────────

  function text(selector) {
    return document.querySelector(selector)?.innerText?.trim() || null;
  }

  function attr(selector, attribute) {
    return document.querySelector(selector)?.getAttribute(attribute) || null;
  }

  function qText(root, selector) {
    return root.querySelector(selector)?.innerText?.trim() || null;
  }

  function qAttr(root, selector, attribute) {
    return root.querySelector(selector)?.getAttribute(attribute) || null;
  }

  function waitForElement(selector, callback, maxWait = 5000) {
    if (document.querySelector(selector)) { callback(); return; }
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        callback();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), maxWait);
  }

  // ── Dex-style in-page widget ───────────────────────────────────────────────

  function currentProfileUrl() {
    return window.location.href.split('?')[0].replace(/\/$/, '');
  }

  async function apiFetch(path, opts = {}) {
    return new Promise(resolve => {
      chrome.runtime.sendMessage(
        { type: 'API_FETCH', path, method: opts.method, body: opts.body },
        (res) => {
          if (chrome.runtime.lastError) return resolve({ ok: false, error: chrome.runtime.lastError.message });
          resolve(res || { ok: false, error: 'no response' });
        }
      );
    });
  }

  function unmountWidget() {
    document.getElementById(WIDGET_HOST_ID)?.remove();
  }

  function mountWidget() {
    if (document.getElementById(WIDGET_HOST_ID)) return;
    console.log('[Nexo] mountWidget: creating host');

    const host = document.createElement('div');
    host.id = WIDGET_HOST_ID;
    // Reset first (guards against LinkedIn styling the host), then apply layout.
    host.style.cssText = 'all:initial;position:fixed;top:88px;right:16px;z-index:2147483647;';
    document.body.appendChild(host);
    console.log('[Nexo] mountWidget: host appended, parent=', host.parentElement?.tagName);

    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>${widgetStyles()}</style>
      <div class="w-wrap" id="w-wrap">
        <button class="w-pill" id="w-pill" title="Nexo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </button>
        <div class="w-panel" id="w-panel">
          <div class="w-header">
            <div class="w-brand">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              <span>Nexo</span>
            </div>
            <button class="w-x" id="w-close" title="Collapse">—</button>
          </div>
          <div class="w-body" id="w-body">
            <div class="w-spinner"></div>
          </div>
        </div>
      </div>
    `;

    const pill   = root.getElementById('w-pill');
    const panel  = root.getElementById('w-panel');
    const close  = root.getElementById('w-close');
    const body   = root.getElementById('w-body');

    pill.addEventListener('click', () => {
      panel.classList.add('w-open');
      pill.classList.add('w-hide');
    });
    close.addEventListener('click', () => {
      panel.classList.remove('w-open');
      pill.classList.remove('w-hide');
    });

    // Start expanded so the user sees it. Toggle to pill on close.
    panel.classList.add('w-open');
    pill.classList.add('w-hide');

    loadWidget(body);
  }

  async function loadWidget(body) {
    if (isConnectionsPage()) {
      return loadConnectionsWidget(body);
    }
    return loadProfileWidget(body);
  }

  async function loadProfileWidget(body) {
    const url = currentProfileUrl();
    const res = await apiFetch(`/api/extension/contact?url=${encodeURIComponent(url)}`);

    if (res.status === 401 || res.error) {
      body.innerHTML = `
        <div class="w-empty">
          <p class="w-muted">Sign in to see your CRM data for this profile.</p>
          <a class="w-btn w-btn-primary" href="${FRONTEND_URL}" target="_blank">Sign in to Nexo →</a>
        </div>`;
      return;
    }

    const data = res.data || {};
    if (!data.found) {
      body.innerHTML = `
        <div class="w-empty">
          <p class="w-muted">Not in your Nexo yet.</p>
          <button class="w-btn w-btn-primary" id="w-save">Save to Nexo</button>
        </div>`;
      body.querySelector('#w-save').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true; btn.textContent = 'Saving…';
        const payload = extractProfileFromDOM();
        console.log('[Nexo] save: sending profile', payload);
        sendWithRetry(
          { type: 'PROFILE_CAPTURED', data: payload },
          2,
          (res) => {
            console.log('[Nexo] save: response', res);
            // Require a real result — previously `success: true, result: null`
            // (silent auth-fail path) was treated as a save.
            if (res?.success && res.result) {
              btn.textContent = '✓ Saved — loading…';
              setTimeout(() => loadWidget(body), 1200);
            } else {
              btn.disabled = false;
              const msg = res?.error || 'unknown error';
              btn.textContent = msg.includes('signed in') ? 'Sign in to Nexo first' : 'Save failed — retry';
              console.warn('[Nexo] save failed:', res);
            }
          }
        );
      });
      return;
    }

    renderContact(body, data.contact, data.notes || []);
  }

  // ── Connections Page Widget ────────────────────────────────────────────────
  // Shows auth state, then an "Import all connections" call-to-action. On click,
  // starts the scan with auto-scroll and reports live progress.

  async function loadConnectionsWidget(body) {
    // Auth probe — /api/extension/status is cheap and returns 401 when not signed in.
    const res = await apiFetch('/api/extension/status');
    if (res.status === 401 || res.error) {
      body.innerHTML = `
        <div class="w-empty">
          <p class="w-muted">Sign in to Nexo to import your connections.</p>
          <a class="w-btn w-btn-primary" href="${FRONTEND_URL}" target="_blank">Sign in to Nexo →</a>
        </div>`;
      return;
    }

    renderConnectionsIntro(body);
  }

  // Track total imported across Import clicks so we can surface a running total.
  let sessionImportedTotal = 0;

  function renderConnectionsIntro(body) {
    console.log('[Nexo] renderConnectionsIntro: starting selection system');
    // Start the selection system (injects checkboxes on all detected cards).
    // Cards may not exist yet — checkboxes appear as LinkedIn renders them.
    waitForElement(
      'a[href*="/in/"]',
      () => {
        console.log('[Nexo] renderConnectionsIntro: anchor present, calling initConnectionsSelection()');
        initConnectionsSelection();
      },
      15000
    );

    const selectedCount = window.__nexoSelection?.size || 0;
    body.innerHTML = `
      <div class="w-scan">
        <p class="w-muted w-small">Every connection below has a <span style="color:#6366f1;font-weight:600">Nexo</span> checkbox. Untick the ones you don't want to import.</p>
        <div class="w-scan-stats">
          <div class="w-stat">
            <div class="w-stat-value" id="w-sel-count">${selectedCount}</div>
            <div class="w-stat-label">Selected</div>
          </div>
          <div class="w-stat">
            <div class="w-stat-value" id="w-sel-imported">${sessionImportedTotal}</div>
            <div class="w-stat-label">Imported</div>
          </div>
        </div>
        <button class="w-btn w-btn-primary" id="w-import" ${selectedCount === 0 ? 'disabled' : ''}>${importLabel(selectedCount)}</button>
        <div class="w-row" style="gap:6px;flex-wrap:wrap">
          <button class="w-btn w-btn-ghost w-btn-small" id="w-select-all">Select all</button>
          <button class="w-btn w-btn-ghost w-btn-small" id="w-clear">Clear</button>
          <button class="w-btn w-btn-ghost w-btn-small" id="w-rescan">Rescan</button>
        </div>
        <p class="w-muted w-small">Up to 50 contacts per import. Scroll to load more connections, then click Import again.</p>
      </div>
    `;

    const countEl    = body.querySelector('#w-sel-count');
    const importedEl = body.querySelector('#w-sel-imported');
    const importBtn  = body.querySelector('#w-import');

    const updateCounter = () => {
      const n = window.__nexoSelection?.size || 0;
      countEl.textContent = String(n);
      importBtn.textContent = importLabel(n);
      importBtn.disabled = n === 0;
      importedEl.textContent = String(sessionImportedTotal);
    };

    const selChangeHandler = () => {
      if (!body.isConnected) return;
      updateCounter();
    };
    window.addEventListener('nexo-selection-change', selChangeHandler);

    body.querySelector('#w-select-all').addEventListener('click', () => {
      // Re-tick every known card.
      (window.__nexoCardBoxes || new Map()).forEach((cb, url) => {
        if (cb.disabled) return; // already imported
        if (!cb.checked) {
          cb.checked = true;
          cb.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    });

    body.querySelector('#w-clear').addEventListener('click', () => {
      (window.__nexoCardBoxes || new Map()).forEach((cb) => {
        if (cb.disabled) return;
        if (cb.checked) {
          cb.checked = false;
          cb.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    });

    body.querySelector('#w-rescan').addEventListener('click', () => {
      const before = window.__nexoSelection?.size || 0;
      window.__nexoDiag?.();
      window.__nexoSelectionController?.rescan?.();
      const after = window.__nexoSelection?.size || 0;
      console.log('[Nexo] rescan: before=' + before + ' after=' + after);
    });

    importBtn.addEventListener('click', async () => {
      renderConnectionsImporting(body);
      const result = await importSelectedBatch(50);
      if (result.ok) {
        sessionImportedTotal += result.imported;
        renderConnectionsImportDone(body, { imported: result.imported, remaining: result.remaining });
      } else {
        renderConnectionsImportError(body, result.error || result.reason || 'unknown');
      }
    });
  }

  function importLabel(n) {
    if (n === 0)   return 'Import (0 selected)';
    if (n <= 50)   return `Import ${n} contact${n === 1 ? '' : 's'}`;
    return `Import 50 of ${n} (more on next click)`;
  }

  function renderConnectionsImporting(body) {
    body.innerHTML = `
      <div class="w-scan">
        <div class="w-row">
          <span class="w-spinner w-spinner-inline"></span>
          <div class="w-status">Importing…</div>
        </div>
        <p class="w-muted w-small">Saving selected contacts to Nexo.</p>
      </div>
    `;
  }

  function renderConnectionsImportDone(body, { imported, remaining }) {
    body.innerHTML = `
      <div class="w-empty">
        <div class="w-status">✓ Imported ${imported}</div>
        <div class="w-scan-stats">
          <div class="w-stat">
            <div class="w-stat-value">${sessionImportedTotal}</div>
            <div class="w-stat-label">Total imported</div>
          </div>
          <div class="w-stat">
            <div class="w-stat-value">${remaining}</div>
            <div class="w-stat-label">Still selected</div>
          </div>
        </div>
        ${remaining > 0
          ? `<button class="w-btn w-btn-primary" id="w-continue">Import next batch</button>`
          : `<p class="w-muted w-small">Scroll to load more connections, then select to continue.</p>`}
        <a class="w-link" href="${FRONTEND_URL}/dashboard/contacts" target="_blank">View in Nexo →</a>
        <button class="w-btn w-btn-ghost w-btn-small" id="w-back">Back to selection</button>
      </div>
    `;
    body.querySelector('#w-continue')?.addEventListener('click', async () => {
      renderConnectionsImporting(body);
      const result = await importSelectedBatch(50);
      if (result.ok) {
        sessionImportedTotal += result.imported;
        renderConnectionsImportDone(body, { imported: result.imported, remaining: result.remaining });
      } else {
        renderConnectionsImportError(body, result.error || 'unknown');
      }
    });
    body.querySelector('#w-back').addEventListener('click', () => renderConnectionsIntro(body));
  }

  function renderConnectionsImportError(body, error) {
    body.innerHTML = `
      <div class="w-empty">
        <div class="w-status" style="color:#ef4444">✗ Import failed</div>
        <p class="w-muted w-small">${escapeHtml(String(error))}</p>
        <button class="w-btn w-btn-primary" id="w-retry">Back to selection</button>
      </div>
    `;
    body.querySelector('#w-retry').addEventListener('click', () => renderConnectionsIntro(body));
  }

  function renderContact(body, contact, notes) {
    const tagChips = (contact.tags || []).map(t =>
      `<span class="w-chip">${escapeHtml(t)}</span>`).join('');

    const notesHtml = notes.length
      ? notes.map(n => `
          <div class="w-note">
            <div class="w-note-date">${formatDate(n.createdAt)}</div>
            <div class="w-note-body">${escapeHtml(n.content)}</div>
          </div>`).join('')
      : `<p class="w-muted w-small">No notes yet.</p>`;

    body.innerHTML = `
      <div class="w-row">
        <div class="w-status">✓ In your network</div>
        ${contact.connection_tier ? `<span class="w-chip w-chip-small">${contact.connection_tier === 1 ? '1st' : contact.connection_tier === 2 ? '2nd' : '3rd'}</span>` : ''}
      </div>
      ${contact.job_title || contact.company ? `
        <div class="w-meta">
          ${contact.job_title ? `<div>${escapeHtml(contact.job_title)}</div>` : ''}
          ${contact.company ? `<div class="w-muted">${escapeHtml(contact.company)}</div>` : ''}
        </div>` : ''}
      ${tagChips ? `<div class="w-chips">${tagChips}</div>` : ''}

      <div class="w-section-label">Notes</div>
      <div class="w-notes" id="w-notes">${notesHtml}</div>

      <form id="w-note-form" class="w-note-form">
        <textarea id="w-note-input" placeholder="Add a note…" rows="2"></textarea>
        <button type="submit" class="w-btn w-btn-primary w-btn-small">Save note</button>
      </form>

      <a class="w-link" href="${FRONTEND_URL}/dashboard/contacts/${contact.id}" target="_blank">Open in Nexo →</a>
    `;

    const form  = body.querySelector('#w-note-form');
    const input = body.querySelector('#w-note-input');
    const list  = body.querySelector('#w-notes');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = input.value.trim();
      if (!content) return;
      const submitBtn = form.querySelector('button');
      submitBtn.disabled = true; submitBtn.textContent = 'Saving…';

      const res = await apiFetch('/api/extension/note', {
        method: 'POST',
        body: { contact_id: contact.id, content },
      });
      submitBtn.disabled = false; submitBtn.textContent = 'Save note';

      if (res.ok && res.data?.note) {
        input.value = '';
        const n = res.data.note;
        const html = `
          <div class="w-note">
            <div class="w-note-date">${formatDate(n.createdAt)}</div>
            <div class="w-note-body">${escapeHtml(n.content)}</div>
          </div>`;
        // Replace "No notes yet" if present
        if (list.querySelector('.w-muted')) list.innerHTML = '';
        list.insertAdjacentHTML('afterbegin', html);
      }
    });
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const diffDays = (Date.now() - d.getTime()) / 86400000;
    if (diffDays < 1)  return 'today';
    if (diffDays < 2)  return 'yesterday';
    if (diffDays < 7)  return `${Math.floor(diffDays)}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function widgetStyles() {
    return `
      :host { all: initial; display: block; font: 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; }
      style { display: none; }
      * { box-sizing: border-box; font-family: inherit; }
      .w-wrap { display: block; }
      .w-pill {
        display: flex; align-items: center; justify-content: center;
        width: 44px; height: 44px; border-radius: 50%;
        background: #6366f1; color: #fff; cursor: pointer;
        box-shadow: 0 4px 16px rgba(99,102,241,0.35); border: none;
      }
      .w-pill:hover { background: #4f46e5; }
      .w-hide { display: none; }

      .w-panel {
        display: none;
        width: 340px; max-height: 80vh; overflow-y: auto;
        background: #fff; border: 1px solid #e5e7eb;
        border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.15);
      }
      .w-open { display: block; }

      .w-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 14px; border-bottom: 1px solid #f1f5f9;
      }
      .w-brand { display: flex; align-items: center; gap: 6px; font-weight: 700; color: #111; font-size: 13px; }
      .w-x { background: none; border: none; color: #64748b; cursor: pointer; font-size: 16px; line-height: 1; padding: 2px 6px; }
      .w-x:hover { color: #111; }

      .w-body { padding: 14px; display: flex; flex-direction: column; gap: 10px; }
      .w-spinner {
        width: 18px; height: 18px; margin: 10px auto;
        border: 2px solid #e5e7eb; border-top-color: #6366f1;
        border-radius: 50%; animation: wspin 0.7s linear infinite;
      }
      @keyframes wspin { to { transform: rotate(360deg); } }

      .w-row { display: flex; align-items: center; gap: 8px; }
      .w-status { color: #22c55e; font-weight: 600; font-size: 13px; }
      .w-meta { font-size: 13px; color: #111; line-height: 1.4; display: flex; flex-direction: column; gap: 2px; }
      .w-muted { color: #64748b; font-size: 13px; }
      .w-small { font-size: 12px; }

      .w-chips { display: flex; flex-wrap: wrap; gap: 4px; }
      .w-chip {
        display: inline-block; padding: 2px 8px; border-radius: 999px;
        background: #eef2ff; color: #4338ca; font-size: 11px; font-weight: 600;
      }
      .w-chip-small { font-size: 10px; padding: 1px 6px; }

      .w-section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-top: 2px; }

      .w-notes { display: flex; flex-direction: column; gap: 6px; max-height: 180px; overflow-y: auto; }
      .w-note { background: #f8fafc; border-radius: 8px; padding: 8px 10px; display: flex; flex-direction: column; gap: 2px; }
      .w-note-date { font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase; }
      .w-note-body { font-size: 13px; color: #111; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }

      .w-note-form { display: flex; flex-direction: column; gap: 6px; }
      .w-note-form textarea {
        width: 100%; resize: vertical; min-height: 44px;
        padding: 8px 10px; border: 1px solid #e5e7eb; border-radius: 8px;
        font-size: 13px; color: #111; background: #fff;
        font-family: inherit;
      }
      .w-note-form textarea:focus { outline: none; border-color: #6366f1; }

      .w-btn {
        display: inline-flex; align-items: center; justify-content: center;
        padding: 8px 12px; border: none; border-radius: 8px;
        font-size: 13px; font-weight: 600; cursor: pointer;
      }
      .w-btn-primary { background: #6366f1; color: #fff; }
      .w-btn-primary:hover { background: #4f46e5; }
      .w-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
      .w-btn-small { padding: 6px 10px; font-size: 12px; align-self: flex-start; }

      .w-empty { display: flex; flex-direction: column; gap: 8px; align-items: stretch; }
      .w-link { font-size: 12px; color: #6366f1; text-decoration: none; font-weight: 600; }
      .w-link:hover { text-decoration: underline; }

      .w-btn-ghost { background: transparent; color: #64748b; border: 1px solid #e5e7eb; }
      .w-btn-ghost:hover { background: #f8fafc; color: #111; }

      .w-toggle-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #475569; cursor: pointer; user-select: none; }
      .w-toggle-row input { margin: 0; accent-color: #6366f1; }

      .w-scan { display: flex; flex-direction: column; gap: 12px; }
      .w-scan-stats { display: flex; gap: 8px; }
      .w-stat {
        flex: 1; background: #f8fafc; border-radius: 8px; padding: 10px;
        text-align: center; display: flex; flex-direction: column; gap: 2px;
      }
      .w-stat-value { font-size: 20px; font-weight: 700; color: #111; line-height: 1.1; }
      .w-stat-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }

      .w-spinner-inline { width: 14px; height: 14px; margin: 0; border-width: 2px; }
    `;
  }

  // ── SPA navigation watcher ─────────────────────────────────────────────────
  // LinkedIn is an SPA, but it also shuffles query strings mid-page (modals,
  // overlays, filters) without actually navigating. We only want to tear down
  // the widget when the *page type* changes — otherwise an active connections
  // scan gets killed every time LinkedIn touches the URL.

  function pageType() {
    if (isProfilePage())     return 'profile';
    if (isConnectionsPage()) return 'connections';
    return 'other';
  }
  function pathKey() {
    // Canonical path — strips query/hash so query-only changes don't fire.
    return window.location.pathname;
  }

  let lastType = pageType();
  let lastPath = pathKey();
  new MutationObserver(() => {
    const currentType = pageType();
    const currentPath = pathKey();
    // Only react when the page type changes, or when the path (not query)
    // changes within the same page type — e.g. jumping /in/foo → /in/bar.
    if (currentType === lastType && currentPath === lastPath) return;
    const prevType = lastType;
    lastType = currentType;
    lastPath = currentPath;

    // Full reset for new page — tear down selection system when leaving
    // the connections page so stray checkboxes don't leak into other views.
    if (prevType === 'connections' && currentType !== 'connections') {
      window.__nexoSelectionController?.teardown?.();
    }
    unmountWidget();

    if (currentType === 'profile') {
      mountWidget();
      waitForElement('h1', () => {
        captureCurrentProfile();
        if (!document.getElementById('nexo-save-btn')) injectNexoButton();
      });
    }

    if (currentType === 'connections') {
      mountWidget();
    }
  }).observe(document.body, { childList: true, subtree: true });

  // Watchdog: if LinkedIn's framework strips the widget host, remount it.
  setInterval(() => {
    if ((isProfilePage() || isConnectionsPage()) && !document.getElementById(WIDGET_HOST_ID)) {
      console.log('[Nexo] watchdog: host missing, remounting');
      mountWidget();
    }
  }, 2000);

})();
