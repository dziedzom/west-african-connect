import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { TrendingUp } from "lucide-react";
import { buildSectorDemand, formatMoney, type LiveListing } from "@/lib/managed";

const SectorDemandPanel = ({ listings }: { listings: LiveListing[] }) => {
  const demand = useMemo(() => buildSectorDemand(listings), [listings]);
  const totalValue = demand.reduce((sum, d) => sum + d.totalValue, 0);
  const withValue = demand.reduce((sum, d) => sum + d.withValue, 0);

  if (listings.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">
        No open or closing-soon listings right now.
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Live listings", value: String(listings.length) },
          { label: "Sectors represented", value: String(demand.length) },
          { label: "With a recorded value", value: String(withValue) },
          { label: "Recorded value total", value: withValue > 0 ? formatMoney(totalValue) : "—" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{stat.label}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold font-data">{stat.value}</p></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Demand by sector
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Open and closing-soon listings only. Values shown are the figures actually published in the notice or tender documents.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sector</TableHead>
                <TableHead className="w-24">Listings</TableHead>
                <TableHead className="w-40">Recorded value</TableHead>
                <TableHead>Nearest deadlines</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {demand.map((row) => (
                <TableRow key={row.sector}>
                  <TableCell className="font-medium">{row.sector}</TableCell>
                  <TableCell className="font-data">{row.count}</TableCell>
                  <TableCell className="font-data">
                    {row.withValue > 0 ? (
                      <span>
                        {formatMoney(row.totalValue)}
                        <span className="text-xs text-muted-foreground ml-1">({row.withValue} of {row.count})</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.nearest.length === 0 ? (
                      <span className="text-muted-foreground text-sm">No dates published</span>
                    ) : (
                      <div className="space-y-1">
                        {row.nearest.map((listing) => (
                          <div key={listing.id} className="flex items-start gap-2 text-sm">
                            <Badge variant="outline" className="font-data shrink-0">
                              {format(new Date(listing.deadline!), "d MMM")}
                            </Badge>
                            <span className="truncate max-w-[22rem]" title={listing.title}>{listing.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SectorDemandPanel;
