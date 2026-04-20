"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Send, Bot, User, Loader2, RefreshCw, History, CheckCircle2, XCircle, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "../lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
};

const SUGGESTED_PROMPTS = [
  {
    icon: "🤝",
    label: "Find help",
    prompt: "I need help with marketing for my startup. Who in my network can help?",
  },
  {
    icon: "💼",
    label: "Industry connections",
    prompt: "Who are my strongest connections in the tech industry?",
  },
  {
    icon: "📞",
    label: "Reconnect",
    prompt: "Who should I reconnect with? I've been out of touch with some people.",
  },
  {
    icon: "🚀",
    label: "Fundraising",
    prompt: "I'm looking to raise funding. Do I know any investors or VCs?",
  },
  {
    icon: "🎨",
    label: "Find talent",
    prompt: "I need a designer for my project. Anyone in my network?",
  },
  {
    icon: "📊",
    label: "Network overview",
    prompt: "Give me an overview of my professional network — who are the key people?",
  },
];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000/api";

export default function NexoAIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Notes search confirmation state
  const [pendingNotesQuery, setPendingNotesQuery] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);

  // History lazy-loading state
  const [hasMore, setHasMore] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyInitialized, setHistoryInitialized] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  // Track whether the next messages update should scroll to bottom
  const shouldScrollToBottom = useRef(true);

  const getAuthHeader = () => {
    const accessToken = localStorage.getItem("accessToken");
    return { Authorization: `Bearer ${accessToken}` };
  };

  // ── Sync status ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchSyncStatus();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (syncing) {
      interval = setInterval(fetchSyncStatus, 10000);
    }
    return () => clearInterval(interval);
  }, [syncing]);

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/ai/sync-pinecone/status`, {
        headers: getAuthHeader(),
      });
      const data = await res.json();
      if (data.success) {
        if (data.lastSync) setLastSync(data.lastSync);
        if (data.history) setSyncHistory(data.history);
        setSyncing(!!data.isSyncing);
      }
    } catch (err) {
      console.error("Failed to fetch sync status", err);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API_BASE}/ai/sync-pinecone`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ force: false }),
      });
      const data = await res.json();
      if (data.success) {
        addLocalMessage("assistant", `✅ **Sync Complete:** ${data.message}`);
        fetchSyncStatus();
      } else {
        addLocalMessage("assistant", `❌ **Sync Failed:** ${data.error}`);
        setSyncing(false);
      }
    } catch (err) {
      console.error(err);
      addLocalMessage("assistant", `❌ **Sync Failed:** Could not connect to server.`);
      setSyncing(false);
    }
  };

  // ── History loading ───────────────────────────────────────────────────────
  const fetchHistory = useCallback(async (before?: string) => {
    setLoadingHistory(true);
    try {
      const url = before
        ? `${API_BASE}/ai/history?limit=20&before=${encodeURIComponent(before)}`
        : `${API_BASE}/ai/history?limit=20`;
      const res = await fetch(url, { headers: getAuthHeader() });
      const data = await res.json();
      if (!data.success) return;
      return { messages: data.messages as Message[], hasMore: data.hasMore as boolean };
    } catch (err) {
      console.error("Failed to load history", err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    (async () => {
      const result = await fetchHistory();
      if (result) {
        setMessages(result.messages);
        setHasMore(result.hasMore);
      }
      setHistoryInitialized(true);
      shouldScrollToBottom.current = true;
    })();
  }, [fetchHistory]);

  // Scroll to bottom after initial history load and after new messages
  useEffect(() => {
    if (!historyInitialized) return;
    if (shouldScrollToBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
      shouldScrollToBottom.current = false;
    }
  }, [messages, historyInitialized]);

  // Smooth scroll to bottom for new sent messages
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ── Load older messages (lazy load on scroll to top) ──────────────────────
  const loadOlderMessages = useCallback(async () => {
    if (loadingHistory || !hasMore || messages.length === 0) return;

    const oldestTimestamp = messages[0]?.created_at;
    if (!oldestTimestamp) return;

    // Save scroll position before prepending
    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;

    const result = await fetchHistory(oldestTimestamp);
    if (!result) return;

    setHasMore(result.hasMore);
    setMessages((prev) => [...result.messages, ...prev]);

    // Restore scroll position so the view doesn't jump
    requestAnimationFrame(() => {
      if (container) {
        container.scrollTop = container.scrollHeight - prevScrollHeight;
      }
    });
  }, [loadingHistory, hasMore, messages, fetchHistory]);

  // IntersectionObserver on top sentinel to trigger lazy load
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadOlderMessages();
        }
      },
      { root: container, threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadOlderMessages]);

  // ── Messaging ─────────────────────────────────────────────────────────────
  const addLocalMessage = (role: "user" | "assistant", content: string) => {
    setMessages((prev) => [...prev, { role, content }]);
  };

  const NOTES_KEYWORDS = /\b(notes?|records?|written|wrote|jotted|documented)\b/i;

  const sendMessage = async (messageText: string, searchNotes = false) => {
    const trimmed = messageText.trim();
    if (!trimmed || loading) return;

    // If the message mentions notes/records and we haven't asked yet, show confirmation
    if (!searchNotes && NOTES_KEYWORDS.test(trimmed) && pendingNotesQuery === null) {
      setInput("");
      addLocalMessage("user", trimmed);
      setPendingNotesQuery(trimmed);
      shouldScrollToBottom.current = true;
      return;
    }

    // Clear any pending notes state
    setPendingNotesQuery(null);

    if (!searchNotes) {
      // Only add user message if we haven't already (pending flow already added it)
      setInput("");
      addLocalMessage("user", trimmed);
    }

    setLoading(true);
    shouldScrollToBottom.current = true;

    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ message: trimmed, searchNotes }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        addLocalMessage("assistant", data.error || "Something went wrong. Please try again.");
        return;
      }

      addLocalMessage("assistant", data.reply ?? "");
      shouldScrollToBottom.current = true;
      scrollToBottom();
    } catch {
      addLocalMessage("assistant", "Could not reach the assistant. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(input);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-border flex justify-between items-center bg-card">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Nexo AI
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your conversational networking assistant
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            {syncing ? "Syncing..." : "Sync AI Data"}
          </Button>
          <div className="flex items-center gap-2">
            {lastSync && (
              <span className="text-xs text-muted-foreground font-medium">
                Last Synced: {new Date(lastSync).toLocaleString()}
              </span>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full">
                  <History className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="px-4 py-3 border-b border-border bg-muted/30">
                  <h4 className="text-sm font-semibold">Sync History</h4>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {syncHistory.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">No history available</div>
                  ) : (
                    syncHistory.map((item) => (
                      <div key={item.id} className="p-3 border-b border-border last:border-0 text-sm flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium flex items-center gap-1.5">
                            {item.status === "success" ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-red-500" />
                            )}
                            Pinecone Embeddings
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.started_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {item.status === "success"
                            ? `Synced ${item.contacts_synced} items in ${Math.round(item.duration_ms / 1000)}s`
                            : `Failed: ${item.error_message || "Unknown error"}`}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Messages — scrollable container with lazy-load sentinel at top */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto px-6"
      >
        <div className="py-4 space-y-6 max-w-3xl mx-auto">
          {/* Top sentinel for IntersectionObserver */}
          <div ref={topSentinelRef} className="h-1" />

          {/* Loading older messages indicator */}
          {loadingHistory && (
            <div className="flex justify-center py-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* No more history indicator */}
          {!hasMore && messages.length > 0 && !loadingHistory && (
            <div className="text-center text-xs text-muted-foreground py-2">
              Beginning of conversation
            </div>
          )}

          {/* Empty state */}
          {messages.length === 0 && historyInitialized && (
            <div className="py-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-1">
                  What can I help you with?
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  I understand your intent and find the right people in your network.
                  Just tell me what you need — I&apos;ll connect the dots.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                {SUGGESTED_PROMPTS.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(suggestion.prompt)}
                    className="group text-left p-4 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all duration-200"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg shrink-0 mt-0.5">{suggestion.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground mb-1">{suggestion.label}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{suggestion.prompt}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((msg, i) => (
            <div
              key={msg.id ?? i}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "rounded-lg px-4 py-3 max-w-[85%]",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {msg.role === "user" ? (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-table:my-2 prose-table:w-full prose-table:border-collapse prose-th:border prose-th:border-border prose-th:bg-muted/50 prose-th:px-3 prose-th:py-2 prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2 prose-td:align-top">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          {/* Notes search confirmation — inline as a chat bubble */}
          {pendingNotesQuery && !loading && (
            <div className="flex gap-3 justify-start">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="rounded-lg px-4 py-3 bg-muted text-foreground max-w-[85%]">
                <p className="text-sm mb-3">Are you searching in the notes you have created?</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendMessage(pendingNotesQuery, false)}
                  >
                    No
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => sendMessage(pendingNotesQuery, true)}
                  >
                    Yes, search notes
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="rounded-lg px-4 py-3 bg-muted flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Analyzing your network...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 p-4 border-t border-border bg-background"
      >
        <div className="max-w-3xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Ask anything — "I need help with fundraising", "Find designers in my network"...'
            className="flex-1"
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
