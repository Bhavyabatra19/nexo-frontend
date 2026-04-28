"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  UserCheck, Sparkles, Loader2, AlertCircle, CheckCircle2,
  Linkedin, RefreshCw, ExternalLink,
} from "lucide-react";
import { groupsService, type ImportedContact } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

type Status = ImportedContact["enrichment_status"];

const STATUS_STYLES: Record<NonNullable<Status> | "pending", { label: string; cls: string }> = {
  pending:    { label: "Not enriched", cls: "border-border text-muted-foreground" },
  queued:     { label: "Queued",       cls: "border-blue-300 text-blue-700 bg-blue-50" },
  enriching:  { label: "Enriching",    cls: "border-blue-300 text-blue-700 bg-blue-50" },
  enriched:   { label: "Enriched",     cls: "border-emerald-300 text-emerald-700 bg-emerald-50" },
  failed:     { label: "Failed",       cls: "border-rose-300 text-rose-700 bg-rose-50" },
  skipped:    { label: "Skipped",      cls: "border-border text-muted-foreground" },
};

function statusOf(c: ImportedContact): keyof typeof STATUS_STYLES {
  return (c.enrichment_status ?? "pending") as keyof typeof STATUS_STYLES;
}

function isInFlight(s: keyof typeof STATUS_STYLES) {
  return s === "queued" || s === "enriching";
}

function isEligible(c: ImportedContact) {
  if (!c.linkedin_url) return false;
  const s = statusOf(c);
  return s !== "enriched" && !isInFlight(s);
}

export default function CommunityImportedContactsCard({ groupId }: { groupId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<"none" | "all" | "selected" | string>("none");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["group-imported-contacts", groupId],
    queryFn: () => groupsService.listImportedContacts(groupId),
    enabled: !!groupId,
    // Poll while anything is queued/enriching so the badges update without
    // a manual refresh. Once everything settles we drop back to no polling.
    refetchInterval: (q) => {
      const inFlight = q.state.data?.stats?.in_progress ?? 0;
      return inFlight > 0 ? 5000 : false;
    },
  });

  const contacts = data?.contacts ?? [];
  const stats = data?.stats;
  const eligibleCount = useMemo(() => contacts.filter(isEligible).length, [contacts]);
  const selectedEligibleIds = useMemo(
    () => contacts.filter(c => selected.has(c.id) && isEligible(c)).map(c => c.id),
    [contacts, selected]
  );

  const toggleAllEligible = () => {
    if (selectedEligibleIds.length === eligibleCount && eligibleCount > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(contacts.filter(isEligible).map(c => c.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  async function runEnrich(payload: { contact_ids?: string[]; all?: boolean }, token: string) {
    setBusy(token);
    try {
      const res = await groupsService.enrichImportedContacts(groupId, payload);
      if (!res.success) {
        toast({ title: "Couldn't queue enrichment", description: res.error, variant: "destructive" });
        return;
      }
      if (res.queued_count === 0) {
        toast({ title: "Nothing to enrich", description: res.message || "Everyone's already enriched or queued." });
        return;
      }
      toast({
        title: `Queued ${res.queued_count} contact${res.queued_count === 1 ? "" : "s"}`,
        description: res.truncated
          ? "Capped at 1,000 per request — run again to enrich the rest."
          : "Bright Data is fetching profiles in the background.",
      });
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["group-imported-contacts", groupId] });
    } catch (err: any) {
      toast({ title: "Network error", description: err?.message, variant: "destructive" });
    } finally {
      setBusy("none");
    }
  }

  return (
    <div>
      <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <UserCheck className="w-4 h-4" />
        Imported community contacts
        {stats && <span className="text-xs text-muted-foreground font-normal">· {stats.total} total</span>}
      </h2>
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <p className="text-xs text-muted-foreground">
          Contacts you've CSV-imported into this community. Run Bright Data enrichment to fill in titles, work history, and recent activity so the network scan can rank them.
        </p>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading imported contacts…
          </div>
        ) : isError ? (
          <div className="flex items-start gap-3 p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium">Couldn't load contacts.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2 gap-1">
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </Button>
            </div>
          </div>
        ) : contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">
            No contacts imported yet. Use the CSV uploader below to add some.
          </p>
        ) : (
          <>
            {/* Stats strip */}
            {stats && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <Badge variant="outline" className="font-normal">
                  <Linkedin className="w-3 h-3 mr-1" />
                  {stats.with_linkedin} with LinkedIn
                </Badge>
                <Badge variant="outline" className={cn("font-normal", STATUS_STYLES.enriched.cls)}>
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {stats.enriched} enriched
                </Badge>
                {stats.in_progress > 0 && (
                  <Badge variant="outline" className={cn("font-normal", STATUS_STYLES.enriching.cls)}>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    {stats.in_progress} in progress
                  </Badge>
                )}
                {stats.failed > 0 && (
                  <Badge variant="outline" className={cn("font-normal", STATUS_STYLES.failed.cls)}>
                    {stats.failed} failed
                  </Badge>
                )}
              </div>
            )}

            {/* Bulk action bar */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => runEnrich({ all: true }, "all")}
                disabled={busy !== "none" || eligibleCount === 0}
                className="gap-1.5"
              >
                {busy === "all" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Enrich all eligible ({eligibleCount})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => runEnrich({ contact_ids: selectedEligibleIds }, "selected")}
                disabled={busy !== "none" || selectedEligibleIds.length === 0}
                className="gap-1.5"
              >
                {busy === "selected" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Enrich selected ({selectedEligibleIds.length})
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => refetch()}
                className="gap-1.5 ml-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </Button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="text-xs w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="w-8 px-2 py-2">
                      <Checkbox
                        checked={
                          eligibleCount > 0 && selectedEligibleIds.length === eligibleCount
                        }
                        onCheckedChange={toggleAllEligible}
                        aria-label="Select all eligible"
                      />
                    </th>
                    <th className="text-left font-medium px-2 py-2">Name</th>
                    <th className="text-left font-medium px-2 py-2">Title / Company</th>
                    <th className="text-left font-medium px-2 py-2">LinkedIn</th>
                    <th className="text-left font-medium px-2 py-2">Status</th>
                    <th className="text-right font-medium px-2 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => {
                    const s = statusOf(c);
                    const eligible = isEligible(c);
                    const inFlight = isInFlight(s);
                    const rowBusy = busy === c.id;
                    return (
                      <tr key={c.id} className="border-t border-border align-top">
                        <td className="px-2 py-2">
                          <Checkbox
                            checked={selected.has(c.id)}
                            onCheckedChange={() => toggleOne(c.id)}
                            disabled={!eligible}
                            aria-label={`Select ${c.full_name || c.email || "contact"}`}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                              {c.photo_url ? (
                                <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-semibold text-muted-foreground">
                                  {(c.full_name || c.first_name || c.email || "?").charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium truncate max-w-[180px]" title={c.full_name || ""}>
                                {c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "—"}
                              </div>
                              {c.email && (
                                <div className="text-muted-foreground truncate max-w-[180px]" title={c.email}>
                                  {c.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-muted-foreground">
                          <div className="truncate max-w-[200px]" title={c.job_title || ""}>{c.job_title || "—"}</div>
                          <div className="truncate max-w-[200px]" title={c.company || ""}>{c.company || ""}</div>
                        </td>
                        <td className="px-2 py-2">
                          {c.linkedin_url ? (
                            <a
                              href={c.linkedin_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                              title={c.linkedin_url}
                            >
                              <Linkedin className="w-3 h-3" />
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <Badge variant="outline" className={cn("font-normal whitespace-nowrap", STATUS_STYLES[s].cls)}>
                            {inFlight && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                            {STATUS_STYLES[s].label}
                          </Badge>
                          {c.enriched_at && s === "enriched" && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {new Date(c.enriched_at).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!eligible || busy !== "none" || rowBusy}
                            onClick={() => runEnrich({ contact_ids: [c.id] }, c.id)}
                            className="gap-1 h-7"
                            title={
                              !c.linkedin_url
                                ? "No LinkedIn URL"
                                : s === "enriched"
                                ? "Already enriched"
                                : inFlight
                                ? "Already in progress"
                                : "Enrich this contact"
                            }
                          >
                            {rowBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            Enrich
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
