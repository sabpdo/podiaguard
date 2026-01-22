"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Bell,
  BellOff,
  AlertTriangle,
  Info,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/context";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success";
  read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    const fetchNotifications = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setNotifications(data || []);
      setIsLoading(false);
    };

    fetchNotifications();
  }, [supabase]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffHours < 1) return t.notifications.justNow;
    if (diffHours < 24) return `${diffHours}${t.notifications.hoursAgo}`;
    if (diffHours < 48) return t.notifications.yesterday;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex flex-col gap-6 p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-semibold">{t.notifications.title}</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} ${unreadCount > 1 ? t.notifications.unreadNotifications : t.notifications.unreadNotification}`
              : t.notifications.allCaughtUp}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            {t.notifications.markAllRead}
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <BellOff className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">{t.notifications.noNotifications}</h3>
              <p className="text-sm text-muted-foreground">
                {t.notifications.noNotificationsDescription}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={cn(
                "transition-all",
                !notification.read && "border-primary/50 bg-primary/5"
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {getIcon(notification.type)}
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {notification.title}
                        {!notification.read && (
                          <Badge variant="secondary" className="text-xs">
                            {t.notifications.new}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {formatDate(notification.created_at)}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteNotification(notification.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {notification.message}
                </p>
                {!notification.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-8 text-xs"
                    onClick={() => markAsRead(notification.id)}
                  >
                    {t.notifications.markAsRead}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
