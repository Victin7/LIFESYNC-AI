import { useEffect, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function NotificationsBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);
    if (data) setItems(data as Notification[]);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("notifs_rt").on("postgres_changes",
      { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
      () => refresh()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refresh]);

  const unread = items.filter((n) => !n.read).length;

  const markAllRead = async () => {
    if (!user || unread === 0) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    refresh();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button aria-label="Notificações" className="relative w-10 h-10 rounded-full border border-border bg-background/60 hover:border-primary/40 transition flex items-center justify-center">
          <Bell className="w-4 h-4 text-muted-foreground" aria-hidden />
          {unread > 0 && (
            <span aria-label={`${unread} não lidas`} className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="text-sm font-medium">Notificações</div>
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary hover:underline">
              Marcar todas como lidas
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Nada novo por aqui.</div>
          ) : items.map((n) => (
            <div key={n.id} className={`p-3 border-b border-border last:border-b-0 ${!n.read ? "bg-primary/5" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-medium">{n.title}</div>
                <span className="text-[10px] text-muted-foreground shrink-0">{relativeTime(n.created_at)}</span>
              </div>
              {n.body && <div className="text-xs text-muted-foreground mt-1">{n.body}</div>}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
