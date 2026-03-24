import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FileText, Activity, Mail } from "lucide-react";
import { format } from "date-fns";

interface Profile {
  id: string;
  user_id: string;
  company_name: string | null;
  email: string | null;
  location: string | null;
  expertise: string | null;
  created_at: string;
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

const StatCard = ({ title, value, icon: Icon, loading }: { title: string; value: number; icon: any; loading: boolean }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {loading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{value}</p>}
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
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [stats, setStats] = useState({ users: 0, proposals: 0, rfps: 0, scraped: 0, contacts: 0, subscribers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [profilesRes, proposalsRes, contactsRes, rfpsCount, scrapedCount, subscribersCount] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("proposals").select("*").order("created_at", { ascending: false }),
        supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("rfps").select("id", { count: "exact", head: true }),
        supabase.from("scraped_rfps").select("id", { count: "exact", head: true }),
        supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }),
      ]);

      setProfiles(profilesRes.data ?? []);
      setProposals(proposalsRes.data ?? []);
      setContacts(contactsRes.data ?? []);
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
                      <TableHead>Location</TableHead>
                      <TableHead>Expertise</TableHead>
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
                        <TableCell>{p.location || "—"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{p.expertise || "—"}</TableCell>
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
