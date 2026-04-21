/**
 * Nexo Content Script — runs on all linkedin.com pages
 *
 * Three modes:
 * 1. Profile page (linkedin.com/in/*): passive DOM capture + inject Nexo button
 * 2. Connections page (/mynetwork/.../connections): passive scroll capture → batch sync
 * 3. Any page: SPA navigation watcher
 */

(function () {
  if (window.__nexoInjected) return;
  window.__nexoInjected = true;

  const isProfilePage     = window.location.pathname.startsWith('/in/');
  const isConnectionsPage = window.location.pathname.includes('/mynetwork/invite-connect/connections');

  if (isProfilePage) {
    waitForElement('h1', () => {
      captureCurrentProfile();
      injectNexoButton();
    });
  }

  if (isConnectionsPage) {
    waitForElement(
      '.mn-connections__list, [class*="scaffold-finite-scroll__content"], li.mn-connection-card',
      startConnectionsCapture,
      15000
    );
  }

  // ── Connections Page Capture ───────────────────────────────────────────────
  // Passive: user scrolls their connections page, we capture cards as they render.
  // Batches of 50 are POSTed to /api/extension/batch via background.

  function startConnectionsCapture() {
    if (window.__nexoScanActive) return;
    window.__nexoScanActive = true;

    const seen    = new Set();   // dedup by linkedin_url
    let   pending = [];
    let   totalSynced = 0;
    let   flushTimer  = null;

    injectScanBadge();
    updateScanBadge(0);

    function processCard(card) {
      const profile = extractConnectionCard(card);
      if (!profile || seen.has(profile.linkedin_url)) return;
      seen.add(profile.linkedin_url);
      pending.push(profile);
      updateScanBadge(seen.size);

      if (pending.length >= 50) {
        clearTimeout(flushTimer);
        flush();
      } else {
        clearTimeout(flushTimer);
        flushTimer = setTimeout(flush, 2000);
      }
    }

    function flush() {
      if (!pending.length) return;
      const batch = pending.splice(0, 50);
      totalSynced += batch.length;
      chrome.runtime.sendMessage(
        { type: 'CONNECTIONS_BATCH', data: batch, total: seen.size },
        () => { if (chrome.runtime.lastError) {} }
      );
    }

    // Capture cards already in the DOM
    queryCards(document).forEach(processCard);

    // Watch for new cards as user scrolls (LinkedIn uses virtual rendering)
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (isConnectionCard(node)) {
            processCard(node);
          } else {
            queryCards(node).forEach(processCard);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Flush on page unload so nothing is lost
    window.addEventListener('beforeunload', flush, { once: true });
  }

  function queryCards(root) {
    return [
      ...root.querySelectorAll(
        'li.mn-connection-card, ' +
        'li[class*="reusable-search__result-container"], ' +
        'li[class*="entity-result"]'
      )
    ];
  }

  function isConnectionCard(el) {
    return el.matches?.(
      'li.mn-connection-card, ' +
      'li[class*="reusable-search__result-container"], ' +
      'li[class*="entity-result"]'
    );
  }

  function extractConnectionCard(card) {
    // Find the primary /in/ profile link — skip overlay / messaging links
    const link = [...card.querySelectorAll('a[href]')].find(a => {
      const href = a.getAttribute('href') || '';
      return /^\/in\/[^/]/.test(href) && !href.includes('/overlay/');
    });
    if (!link) return null;

    const rawPath    = link.getAttribute('href').split('?')[0].replace(/\/$/, '');
    const linkedin_url = `https://www.linkedin.com${rawPath}`;

    // Name — multiple selector strategies for different LinkedIn layouts
    const name =
      qText(card, '[class*="connection-card__name"]') ||
      qText(card, '[class*="entity-result__title-line"] span[aria-hidden] span:first-child') ||
      qText(card, 'h3 span[aria-hidden] span:first-child') ||
      // aria-label on the link itself: "View John Doe's profile"
      link.getAttribute('aria-label')
          ?.replace(/^(View\s+)?/i, '')
          .replace(/'?s\s+profile$/i, '')
          .trim() ||
      null;

    if (!name) return null;

    const headline =
      qText(card, '[class*="connection-card__occupation"]') ||
      qText(card, '[class*="entity-result__primary-subtitle"]') ||
      qText(card, '.t-14.t-black--light.t-normal') ||
      null;

    const profile_pic =
      qAttr(card, 'img[src*="licdn.com"]', 'src') ||
      qAttr(card, 'img[src*="media.linkedin"]', 'src') ||
      null;

    return {
      linkedin_url,
      name,
      headline,
      company:           null,  // enriched server-side from headline
      profile_pic,
      connection_degree: 1,
      captured_at:       new Date().toISOString(),
    };
  }

  // ── In-page scan badge ─────────────────────────────────────────────────────

  function injectScanBadge() {
    if (document.getElementById('nexo-scan-badge')) return;
    injectButtonStyles();

    const badge = document.createElement('div');
    badge.id = 'nexo-scan-badge';
    badge.innerHTML = `
      <span class="nexo-spinner"></span>
      <span id="nexo-scan-count">Nexo: scanning connections…</span>
      <button id="nexo-scan-close" title="Dismiss">✕</button>
    `;
    document.body.appendChild(badge);

    document.getElementById('nexo-scan-close').addEventListener('click', () => {
      badge.remove();
    });
  }

  function updateScanBadge(count) {
    const el = document.getElementById('nexo-scan-count');
    if (el) el.textContent = `Nexo: ${count} connections captured — keep scrolling`;
  }

  // ── Profile Page Capture ───────────────────────────────────────────────────

  function captureCurrentProfile() {
    const profile = extractProfileFromDOM();
    if (!profile.name) return;
    chrome.runtime.sendMessage({ type: 'PROFILE_CAPTURED', data: profile }, () => {
      if (chrome.runtime.lastError) {}
    });
  }

  function extractProfileFromDOM() {
    const cleanUrl = window.location.href.split('?')[0].replace(/\/$/, '');
    return {
      linkedin_url:      cleanUrl,
      name:              text('h1') || text('.text-heading-xlarge'),
      headline:          text('.text-body-medium.break-words') || text('div[data-field="headline"]'),
      company:           extractCurrentCompany(),
      location:          text('.text-body-small.inline.t-black--light.break-words'),
      profile_pic:       attr('img.pv-top-card-profile-picture__image', 'src') ||
                         attr('img.profile-photo-edit__preview', 'src'),
      connection_degree: extractConnectionDegree(),
      captured_at:       new Date().toISOString(),
    };
  }

  function extractCurrentCompany() {
    const expEntry = document.querySelector(
      '#experience ~ div li:first-child .t-14.t-normal, ' +
      'section[id*="experience"] li:first-child .t-14.t-normal'
    );
    if (expEntry) return expEntry.innerText?.trim();

    const aboutCompany = document.querySelector('span[aria-label*="Current company"]');
    if (aboutCompany) return aboutCompany.innerText?.trim();

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

    const actionBar = document.querySelector('.pvs-profile-actions, .pv-top-card-v2-ctas');
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

      chrome.runtime.sendMessage({ type: 'PROFILE_CAPTURED', data: extractProfileFromDOM() }, (res) => {
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
    injectButtonStyles();
  }

  function injectButtonStyles() {
    if (document.getElementById('nexo-styles')) return;
    const style = document.createElement('style');
    style.id = 'nexo-styles';
    style.textContent = `
      .nexo-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 16px;
        background: #6366f1;
        color: #fff;
        border: none;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
        margin-right: 8px;
        height: 32px;
        white-space: nowrap;
      }
      .nexo-btn:hover { background: #4f46e5; }
      .nexo-btn:disabled { opacity: 0.7; cursor: not-allowed; }
      .nexo-spinner {
        width: 12px; height: 12px;
        border: 2px solid rgba(255,255,255,0.4);
        border-top-color: #fff;
        border-radius: 50%;
        display: inline-block;
        animation: nexo-spin 0.6s linear infinite;
      }
      @keyframes nexo-spin { to { transform: rotate(360deg); } }

      #nexo-scan-badge {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 99999;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        background: #1e1b4b;
        color: #fff;
        border-radius: 12px;
        font-size: 13px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      }
      #nexo-scan-close {
        background: none;
        border: none;
        color: rgba(255,255,255,0.5);
        cursor: pointer;
        font-size: 12px;
        padding: 0 0 0 4px;
        line-height: 1;
      }
      #nexo-scan-close:hover { color: #fff; }
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

  // ── SPA navigation watcher ─────────────────────────────────────────────────
  // LinkedIn never does full page reloads — watch for URL changes.

  let lastUrl = window.location.href;
  new MutationObserver(() => {
    if (window.location.href === lastUrl) return;
    lastUrl = window.location.href;
    window.__nexoInjected  = false;
    window.__nexoScanActive = false;

    if (window.location.pathname.startsWith('/in/')) {
      window.__nexoInjected = true;
      waitForElement('h1', () => {
        captureCurrentProfile();
        injectNexoButton();
      });
    }

    if (window.location.pathname.includes('/mynetwork/invite-connect/connections')) {
      window.__nexoInjected = true;
      waitForElement(
        '.mn-connections__list, [class*="scaffold-finite-scroll__content"], li.mn-connection-card',
        startConnectionsCapture,
        15000
      );
    }
  }).observe(document.body, { childList: true, subtree: true });

})();
