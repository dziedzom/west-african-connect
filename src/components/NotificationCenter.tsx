import { useState, useEffect, useRef } from "react";
import { Bell, FileText, CheckCircle2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

interface Notification {
  id: string;
  icon: typeof FileText;
  title: string;
  description: string;
  time: string;
  read: boolean;
}

const NotificationCenter = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("partnership_applications")
        .select("id, status, created_at, company_name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      const items: Notification[] = (data || []).map((app: any) => ({
        id: app.id,
        icon: app.status === "approved" ? CheckCircle2 : app.status === "rejected" ? Info : FileText,
        title: app.status === "approved"
          ? "Application Approved"
          : app.status === "rejected"
          ? "Application Update"
          : "Application Submitted",
        description: `${app.company_name} — ${app.status}`,
        time: new Date(app.created_at).toLocaleDateString(),
        read: app.status !== "pending",
      }));
      setNotifications(items);
    };
    load();
  }, [user]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-3.5 w-3.5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[8px] font-bold text-accent-foreground">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-border bg-card/80 backdrop-blur-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-display font-semibold text-foreground">Notifications</p>
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No notifications yet.</p>
            </div>
          ) : (
            <ul className="max-h-64 overflow-y-auto divide-y divide-border">
              {notifications.map((n) => {
                const Icon = n.icon;
                return (
                  <li key={n.id} className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${!n.read ? "bg-accent/5" : ""}`}>
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${!n.read ? "text-accent" : "text-muted-foreground"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-display font-medium text-foreground">{n.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{n.description}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{n.time}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
