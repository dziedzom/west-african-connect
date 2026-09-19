import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Save, Send } from "lucide-react";

interface Settings {
  enabled: boolean;
  chat_id: string | null;
  min_days_to_deadline: number;
  priority_sectors: string[];
  send_unknown_deadline: boolean;
  mute_prospect_match: boolean;
  mute_priority_sector: boolean;
  mute_candidate_portal: boolean;
  mute_scraper_alerts: boolean;
  max_messages_per_run: number;
  admin_base_url: string;
}

interface LogRow {
  id: string;
  category: string;
  subject: string | null;
  status: string;
  error: string | null;
  created_at: string;
}

const relative = (iso: string) => {
  const mins = (Date.now() - new Date(iso).getTime()) / 60_000;
  if (mins < 60) return `${Math.max(1, Math.round(mins))}m ago`;
  if (mins < 2880) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};

const MUTES: Array<{ key: keyof Settings; label: string }> = [
  { key: "mute_prospect_match", label: "Prospect-matched tenders" },
  { key: "mute_priority_sector", label: "Priority-sector tenders" },
  { key: "mute_candidate_portal", label: "New candidate portals" },
  { key: "mute_scraper_alerts", label: "Scraper credential & heartbeat failures" },
];

const TelegramAlertsPanel = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [sectorText, setSectorText] = useState("");
  const [log, setLog] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [s, l] = await Promise.all([
      supabase.from("telegram_alert_settings").select("*").eq("id", true).maybeSingle(),
      supabase.from("telegram_alert_log").select("id, category, subject, status, error, created_at")
        .order("created_at", { ascending: false }).limit(15),
    ]);
    if (s.error) {
      toast({ title: "Could not load alert settings", description: s.error.message, variant: "destructive" });
    } else if (s.data) {
      setSettings(s.data as unknown as Settings);
      setSectorText(((s.data as unknown as Settings).priority_sectors ?? []).join(", "));
    }
    setLog((l.data ?? []) as LogRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const patch = (p: Partial<Settings>) => setSettings((s) => (s ? { ...s, ...p } : s));

  const save = async () => {
    if (!settings) return;
    setBusy("save");
    const sectors = sectorText.split(",").map((s) => s.trim()).filter(Boolean);
    const { error } = await supabase.from("telegram_alert_settings").update({
      enabled: settings.enabled,
      min_days_to_deadline: Number(settings.min_days_to_deadline) || 14,
      max_messages_per_run: Number(settings.max_messages_per_run) || 12,
      priority_sectors: sectors,
      send_unknown_deadline: settings.send_unknown_deadline,
      mute_prospect_match: settings.mute_prospect_match,
      mute_priority_sector: settings.mute_priority_sector,
      mute_candidate_portal: settings.mute_candidate_portal,
      mute_scraper_alerts: settings.mute_scraper_alerts,
      admin_base_url: settings.admin_base_url,
      chat_id: settings.chat_id?.trim() || null,
    }).eq("id", true);
    setBusy(null);
    if (error) toast({ title: "Could not save", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Alert settings saved" });
      load();
    }
  };

  const sendTest = async () => {
    setBusy("test");
    try {
      const { data, error } = await supabase.functions.invoke("discover-search", { body: { action: "test_telegram" } });
      if (error) throw error;
      const r = data as { ok?: boolean; telegram?: { status: string; error?: string } };
      if (!r.ok) throw new Error(r.telegram?.error || r.telegram?.status || "Telegram rejected the message");
      toast({ title: "Test message sent", description: "Check the group." });
    } catch (e) {
      toast({ title: "Test failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
      load();
    }
  };

  return (
    <div className="border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Send className="h-4 w-4" /> Telegram alerts
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sends prospect-matched tenders, priority-sector tenders with lead time, new candidate portals and scraper failures to the team group.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={sendTest} disabled={busy !== null}>
            {busy === "test" ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-2 h-3.5 w-3.5" />}
            Send a test message
          </Button>
          <Button size="sm" onClick={save} disabled={busy !== null || !settings}>
            {busy === "save" ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
            Save
          </Button>
        </div>
      </div>

      {loading && !settings ? (
        <div className="mt-5 space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
      ) : settings ? (
        <>
          <div className="mt-5 flex items-center gap-3 border border-border p-3">
            <Switch checked={settings.enabled} onCheckedChange={(v) => patch({ enabled: v })} id="tg-enabled" />
            <Label htmlFor="tg-enabled" className="text-sm">Send alerts to Telegram</Label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-xs text-muted-foreground">Minimum days before deadline</Label>
              <Input type="number" min={0} className="mt-1 h-9" value={settings.min_days_to_deadline}
                onChange={(e) => patch({ min_days_to_deadline: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Maximum messages per run</Label>
              <Input type="number" min={1} className="mt-1 h-9" value={settings.max_messages_per_run}
                onChange={(e) => patch({ max_messages_per_run: Number(e.target.value) })} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs text-muted-foreground">Priority sectors (comma separated)</Label>
              <Input className="mt-1 h-9" value={sectorText} onChange={(e) => setSectorText(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs text-muted-foreground">Review link base address</Label>
              <Input className="mt-1 h-9" value={settings.admin_base_url}
                onChange={(e) => patch({ admin_base_url: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs text-muted-foreground">Group chat ID (leave blank to use the stored one)</Label>
              <Input className="mt-1 h-9 font-data" placeholder="-1004392170607" value={settings.chat_id ?? ""}
                onChange={(e) => patch({ chat_id: e.target.value })} />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 border border-border p-3">
            <Switch checked={settings.send_unknown_deadline} id="tg-unknown"
              onCheckedChange={(v) => patch({ send_unknown_deadline: v })} />
            <Label htmlFor="tg-unknown" className="text-sm">
              Also send priority-sector tenders whose deadline isn't stated on the page
            </Label>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Mute categories</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {MUTES.map((m) => (
                <div key={m.key} className="flex items-center justify-between gap-3 border border-border p-3">
                  <Label htmlFor={m.key} className="text-sm">{m.label}</Label>
                  <Switch id={m.key} checked={Boolean(settings[m.key])}
                    onCheckedChange={(v) => patch({ [m.key]: v } as Partial<Settings>)} />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Switched on means muted — nothing from that category is sent.</p>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent messages</h3>
            {log.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nothing sent yet.</p>
            ) : (
              <div className="mt-3 divide-y divide-border border border-border">
                {log.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate">{r.subject ?? r.category}</p>
                      <p className="font-data text-xs text-muted-foreground">
                        {r.category} · {relative(r.created_at)}
                        {r.error ? ` · ${r.error.slice(0, 120)}` : ""}
                      </p>
                    </div>
                    <span className={`font-data text-xs ${r.status === "sent" ? "text-muted-foreground" : "text-destructive"}`}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No alert settings row found.</p>
      )}
    </div>
  );
};

export default TelegramAlertsPanel;
