import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface Row {
  id: string;
  status: string;
  predicted_match_score: number | null;
  predicted_win_probability: number | null;
  predicted_review_score: number | null;
  contract_value: number | null;
  outcome_reported_at: string | null;
  created_at: string;
  scraped_rfps: { title: string; deadline: string | null; portal: string | null; source_category: string | null } | null;
}

const TERMINAL = ["won", "lost", "no_decision_yet", "not_pursued"];
const DECIDED = ["won", "lost"];

const BANDS = [
  { label: "0–20%", min: 0, max: 20 },
  { label: "21–40%", min: 21, max: 40 },
  { label: "41–60%", min: 41, max: 60 },
  { label: "61–80%", min: 61, max: 80 },
  { label: "81–100%", min: 81, max: 100 },
];

const pct = (n: number, d: number) => (d === 0 ? "—" : `${Math.round((n / d) * 100)}%`);

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <Card>
    <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{label}</CardTitle></CardHeader>
    <CardContent><p className="text-xl font-bold">{value}</p></CardContent>
  </Card>
);

const AdminOutcomesTab = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("opportunity_tracker")
      .select("id, status, predicted_match_score, predicted_win_probability, predicted_review_score, contract_value, outcome_reported_at, created_at, scraped_rfps(title, deadline, portal, source_category)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows((data as unknown as Row[]) ?? []);
        setLoading(false);
      });
  }, []);

  const summary = useMemo(() => {
    const now = Date.now();
    const counts: Record<string, number> = {};
    rows.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
    const decided = rows.filter((r) => DECIDED.includes(r.status));
    const unreported = rows.filter((r) => {
      const d = r.scraped_rfps?.deadline;
      return !TERMINAL.includes(r.status) && !!d && new Date(d).getTime() < now;
    });
    const totalWonValue = rows
      .filter((r) => r.status === "won")
      .reduce((s, r) => s + Number(r.contract_value || 0), 0);
    return { counts, decided, unreported, totalWonValue };
  }, [rows]);

  const accuracyByWinProbability = useMemo(
    () =>
      BANDS.map((b) => {
        const inBand = summary.decided.filter(
          (r) => r.predicted_win_probability != null && r.predicted_win_probability >= b.min && r.predicted_win_probability <= b.max,
        );
        const won = inBand.filter((r) => r.status === "won").length;
        const avgPredicted = inBand.length
          ? Math.round(inBand.reduce((s, r) => s + Number(r.predicted_win_probability), 0) / inBand.length)
          : null;
        return { band: b.label, decided: inBand.length, won, actual: pct(won, inBand.length), predicted: avgPredicted != null ? `${avgPredicted}%` : "—" };
      }),
    [summary.decided],
  );

  const accuracyByMatchScore = useMemo(
    () =>
      BANDS.map((b) => {
        const inBand = summary.decided.filter(
          (r) => r.predicted_match_score != null && r.predicted_match_score >= b.min && r.predicted_match_score <= b.max,
        );
        const won = inBand.filter((r) => r.status === "won").length;
        return { band: b.label, decided: inBand.length, won, actual: pct(won, inBand.length) };
      }),
    [summary.decided],
  );

  const bySource = useMemo(() => {
    const map = new Map<string, { tracked: number; decided: number; won: number; value: number }>();
    rows.forEach((r) => {
      const key = r.scraped_rfps?.portal ?? "Unknown";
      const e = map.get(key) ?? { tracked: 0, decided: 0, won: 0, value: 0 };
      e.tracked++;
      if (DECIDED.includes(r.status)) e.decided++;
      if (r.status === "won") { e.won++; e.value += Number(r.contract_value || 0); }
      map.set(key, e);
    });
    return [...map.entries()]
      .map(([portal, v]) => ({ portal, ...v }))
      .sort((a, b) => b.won - a.won || b.tracked - a.tracked);
  }, [rows]);

  if (loading) {
    return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  const won = summary.counts.won || 0;
  const lost = summary.counts.lost || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Stat label="Tracked" value={rows.length} />
        <Stat label="Submitted" value={summary.counts.submitted || 0} />
        <Stat label="Won" value={won} />
        <Stat label="Lost" value={lost} />
        <Stat label="Win rate" value={pct(won, won + lost)} />
        <Stat label="Awaiting report" value={summary.unreported.length} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Prediction accuracy — win probability</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Predicted band</TableHead>
                <TableHead>Decided bids</TableHead>
                <TableHead>Avg predicted</TableHead>
                <TableHead>Actual win rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accuracyByWinProbability.map((r) => (
                <TableRow key={r.band}>
                  <TableCell className="font-medium">{r.band}</TableCell>
                  <TableCell>{r.decided}</TableCell>
                  <TableCell>{r.predicted}</TableCell>
                  <TableCell className="font-semibold">{r.actual}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground mt-3">
            A well-calibrated model shows an actual win rate close to the predicted band. Bands need decided bids before they mean anything.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Prediction accuracy — match score</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Match score band</TableHead>
                <TableHead>Decided bids</TableHead>
                <TableHead>Won</TableHead>
                <TableHead>Win rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accuracyByMatchScore.map((r) => (
                <TableRow key={r.band}>
                  <TableCell className="font-medium">{r.band}</TableCell>
                  <TableCell>{r.decided}</TableCell>
                  <TableCell>{r.won}</TableCell>
                  <TableCell className="font-semibold">{r.actual}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Which sources produce wins</CardTitle></CardHeader>
        <CardContent>
          {bySource.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tracked opportunities yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Tracked</TableHead>
                  <TableHead>Decided</TableHead>
                  <TableHead>Won</TableHead>
                  <TableHead>Win rate</TableHead>
                  <TableHead>Contract value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bySource.map((s) => (
                  <TableRow key={s.portal}>
                    <TableCell className="font-medium">{s.portal}</TableCell>
                    <TableCell>{s.tracked}</TableCell>
                    <TableCell>{s.decided}</TableCell>
                    <TableCell>{s.won}</TableCell>
                    <TableCell>{pct(s.won, s.decided)}</TableCell>
                    <TableCell>{s.value ? s.value.toLocaleString() : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Recent outcomes</CardTitle></CardHeader>
        <CardContent>
          {rows.filter((r) => TERMINAL.includes(r.status)).length === 0 ? (
            <p className="text-sm text-muted-foreground">No outcomes reported yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opportunity</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Predicted</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Reported</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.filter((r) => TERMINAL.includes(r.status)).slice(0, 25).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="max-w-[240px] truncate font-medium">{r.scraped_rfps?.title ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "won" ? "default" : "secondary"} className="text-[10px]">
                        {r.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.predicted_match_score != null ? `${r.predicted_match_score}% match` : "—"}
                      {r.predicted_win_probability != null && ` · ${r.predicted_win_probability}% win`}
                    </TableCell>
                    <TableCell className="text-xs">{r.contract_value ? Number(r.contract_value).toLocaleString() : "—"}</TableCell>
                    <TableCell className="text-xs">
                      {r.outcome_reported_at ? new Date(r.outcome_reported_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOutcomesTab;
