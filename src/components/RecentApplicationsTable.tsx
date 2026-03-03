import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileCheck, Clock, XCircle, CheckCircle2 } from "lucide-react";

interface Application {
  id: string;
  company_name: string;
  contact_email: string;
  status: string;
  created_at: string;
  rfp_id: string;
}

const statusConfig: Record<string, { icon: typeof Clock; label: string; className: string }> = {
  pending: { icon: Clock, label: "Pending", className: "bg-accent/10 text-accent border-accent/20" },
  approved: { icon: CheckCircle2, label: "Approved", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  rejected: { icon: XCircle, label: "Rejected", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const RecentApplicationsTable = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchApplications = async () => {
      const { data } = await supabase
        .from("partnership_applications")
        .select("id, company_name, contact_email, status, created_at, rfp_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setApplications((data as Application[]) || []);
      setLoading(false);
    };
    fetchApplications();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <FileCheck className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No applications yet.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Apply to partnership RFPs to see them here.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs font-display">Company</TableHead>
          <TableHead className="text-xs font-display">Date</TableHead>
          <TableHead className="text-xs font-display text-right">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {applications.map((app) => {
          const config = statusConfig[app.status] || statusConfig.pending;
          const Icon = config.icon;
          return (
            <TableRow key={app.id} className="group">
              <TableCell className="font-display font-medium text-sm">{app.company_name}</TableCell>
              <TableCell className="text-xs text-muted-foreground font-body">
                {new Date(app.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant="outline" className={`text-[10px] gap-1 ${config.className}`}>
                  <Icon className="h-3 w-3" />
                  {config.label}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default RecentApplicationsTable;
