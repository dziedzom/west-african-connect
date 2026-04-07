import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FileText, Activity, Mail, DollarSign, TrendingUp, CheckCircle, Pencil } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  user_id: string;
  company_name: string | null;
  email: string | null;
  location: string | null;
  expertise: string | null;
  created_at: string;
  subscription_tier: string;
  subscription_plan: string | null;
  subscription_amount: number | null;
  subscription_start: string | null;
  subscription_end: string | null;
}

interface Proposal {
  id: string;
  title: string;
  status: string;
  user_id: string;
  created_at: string;
  rfp_id: string | null;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  created_at: string;
}

interface WonContract {
  id: string;
  user_id: string;
  rfp_title: string;
  contract_value: number;
  currency: string;
  success_fee: number;
  invoice_sent: boolean;
  fee_paid: boolean;
  created_at: string;
}

const StatCard = ({ title, value, icon: Icon, loading, prefix }: { title: string; value: number | string; icon: any; loading: boolean; prefix?: string }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {loading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{prefix}{value}</p>}
    </CardContent>
  </Card>
);

const statusColor = (status: string) => {
  switch (status) {
    case "draft": return "secondary";
    case "submitted": return "default";
    case "under_review": return "outline";
    case "won": return "default";
    case "lost": return "destructive";
    default: return "secondary";
  }
};

const AdminDashboard = () => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [wonContracts, setWonContracts] = useState<WonContract[]>([]);
  const [stats, setStats] = useState({ users: 0, proposals: 0, rfps: 0, scraped: 0, contacts: 0, subscribers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [profilesRes, proposalsRes, contactsRes, rfpsCount, scrapedCount, subscribersCount, wonRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("proposals").select("*").order("created_at", { ascending: false }),
        supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("rfps").select("id", { count: "exact", head: true }),
        supabase.from("scraped_rfps").select("id", { count: "exact", head: true }),
        supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }),
        supabase.from("won_contracts").select("*").order("created_at", { ascending: false }),
      ]);

      setProfiles((profilesRes.data ?? []) as Profile[]);
      setProposals(proposalsRes.data ?? []);
      setContacts(contactsRes.data ?? []);
      setWonContracts((wonRes.data ?? []) as WonContract[]);
      setStats({
        users: profilesRes.data?.length ?? 0,
        proposals: proposalsRes.data?.length ?? 0,
        rfps: rfpsCount.count ?? 0,
        scraped: scrapedCount.count ?? 0,
        contacts: contactsRes.data?.length ?? 0,
        subscribers: subscribersCount.count ?? 0,
      });
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Revenue calculations
  const proProfiles = profiles.filter((p) => p.subscription_tier === "pro");
  const monthlySubscribers = proProfiles.filter((p) => p.subscription_plan === "monthly");
  const annualSubscribers = proProfiles.filter((p) => p.subscription_plan === "annual");
  const mrr = monthlySubscribers.length * 40 + annualSubscribers.length * 32;
  const totalSuccessFeesInvoiced = wonContracts.reduce((sum, c) => sum + (c.success_fee || 0), 0);
  const totalSuccessFeesPaid = wonContracts.filter((c) => c.fee_paid).reduce((sum, c) => sum + (c.success_fee || 0), 0);
  const totalPipelineValue = wonContracts.reduce((sum, c) => sum + (c.contract_value || 0), 0);

  const handleMarkPaid = async (id: string) => {
    const { error } = await supabase
      .from("won_contracts")
      .update({ fee_paid: true, fee_paid_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) {
      setWonContracts((prev) => prev.map((c) => c.id === id ? { ...c, fee_paid: true } : c));
      toast({ title: "Marked as paid" });
    }
  };

  const formatCurrency = (val: number) => `$${val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Monitor platform activity and manage users</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={stats.users} icon={Users} loading={loading} />
        <StatCard title="Proposals" value={stats.proposals} icon={FileText} loading={loading} />
        <StatCard title="RFPs" value={stats.rfps + stats.scraped} icon={Activity} loading={loading} />
        <StatCard title="Contact Messages" value={stats.contacts} icon={Mail} loading={loading} />
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No users yet</TableCell></TableRow>
                    ) : profiles.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.company_name || "—"}</TableCell>
                        <TableCell>{p.email || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={p.subscription_tier === "pro" ? "default" : "secondary"}>
                            {p.subscription_tier === "pro" ? `Pro (${p.subscription_plan || "—"})` : "Free"}
                          </Badge>
                        </TableCell>
                        <TableCell>{p.location || "—"}</TableCell>
                        <TableCell>{format(new Date(p.created_at), "MMM d, yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proposals">
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proposals.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No proposals yet</TableCell></TableRow>
                    ) : proposals.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.title}</TableCell>
                        <TableCell><Badge variant={statusColor(p.status) as any}>{p.status.replace("_", " ")}</Badge></TableCell>
                        <TableCell>{format(new Date(p.created_at), "MMM d, yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <div className="space-y-6">
            {/* Revenue summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Monthly MRR</CardTitle></CardHeader>
                <CardContent><p className="text-xl font-bold">{formatCurrency(monthlySubscribers.length * 40)}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Annual ARR (monthly equiv.)</CardTitle></CardHeader>
                <CardContent><p className="text-xl font-bold">{formatCurrency(annualSubscribers.length * 32)}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Effective MRR</CardTitle></CardHeader>
                <CardContent><p className="text-xl font-bold text-accent">{formatCurrency(mrr)}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Fees Invoiced</CardTitle></CardHeader>
                <CardContent><p className="text-xl font-bold">{formatCurrency(totalSuccessFeesInvoiced)}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Fees Collected</CardTitle></CardHeader>
                <CardContent><p className="text-xl font-bold">{formatCurrency(totalSuccessFeesPaid)}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Pipeline Value</CardTitle></CardHeader>
                <CardContent><p className="text-xl font-bold">{formatCurrency(totalPipelineValue)}</p></CardContent>
              </Card>
            </div>

            {/* Subscriptions */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Pro Subscriptions</CardTitle></CardHeader>
              <CardContent>
                {proProfiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No Pro subscribers yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {proProfiles.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.company_name || p.email || "—"}</TableCell>
                          <TableCell className="capitalize">{p.subscription_plan || "—"}</TableCell>
                          <TableCell>${p.subscription_amount || "—"}</TableCell>
                          <TableCell>{p.subscription_start ? format(new Date(p.subscription_start), "MMM d, yyyy") : "—"}</TableCell>
                          <TableCell>{p.subscription_end ? format(new Date(p.subscription_end), "MMM d, yyyy") : "—"}</TableCell>
                          <TableCell>
                            <Badge variant="default">Active</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Won contracts */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Won Contracts</CardTitle></CardHeader>
              <CardContent>
                {wonContracts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No won contracts reported yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>RFP Title</TableHead>
                        <TableHead>Contract Value</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead>Success Fee (USD)</TableHead>
                        <TableHead>Invoice Sent</TableHead>
                        <TableHead>Fee Paid</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {wonContracts.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">{c.rfp_title}</TableCell>
                          <TableCell>{c.contract_value.toLocaleString()}</TableCell>
                          <TableCell>{c.currency}</TableCell>
                          <TableCell className="font-semibold">${c.success_fee.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={c.invoice_sent ? "default" : "secondary"}>
                              {c.invoice_sent ? "Sent" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={c.fee_paid ? "default" : "outline"}>
                              {c.fee_paid ? "Paid" : "Unpaid"}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(new Date(c.created_at), "MMM d, yyyy")}</TableCell>
                          <TableCell>
                            {!c.fee_paid && (
                              <Button size="sm" variant="outline" onClick={() => handleMarkPaid(c.id)} className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" /> Mark Paid
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Local RFPs</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">{stats.rfps}</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Scraped RFPs</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">{stats.scraped}</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Newsletter Subscribers</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">{stats.subscribers}</p></CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-lg">Recent Contact Messages</CardTitle></CardHeader>
              <CardContent>
                {contacts.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No messages yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.slice(0, 20).map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{c.email}</TableCell>
                          <TableCell>{c.subject || "—"}</TableCell>
                          <TableCell>{format(new Date(c.created_at), "MMM d, yyyy")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
