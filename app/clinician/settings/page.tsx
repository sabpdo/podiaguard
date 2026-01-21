"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { 
  ArrowLeft,
  Loader2,
  User,
  Bell,
  Shield,
  LogOut
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<{
    email?: string;
    user_metadata?: {
      full_name?: string;
      license_number?: string;
      specialty?: string;
      institution?: string;
    };
  } | null>(null);
  const [notifications, setNotifications] = useState({
    criticalAlerts: true,
    missedUploads: true,
    weeklyReports: false,
  });

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);
      setLoading(false);
    }
    loadUser();
  }, [supabase, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    // In production, save to database
    await new Promise(resolve => setTimeout(resolve, 500));
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card">
        <div className="flex items-center gap-3 p-4 max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => router.push("/clinician")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your account</p>
          </div>
        </div>
      </header>

      <div className="flex-1 p-4 max-w-4xl mx-auto w-full space-y-4">
        {/* Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Profile</CardTitle>
                <CardDescription>Your professional information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={user?.user_metadata?.full_name || ""} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ""} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>License Number</Label>
                <Input value={user?.user_metadata?.license_number || ""} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Specialty</Label>
                <Input value={user?.user_metadata?.specialty || ""} readOnly className="bg-muted" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Institution</Label>
              <Input value={user?.user_metadata?.institution || ""} readOnly className="bg-muted" />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Notifications</CardTitle>
                <CardDescription>Configure alert preferences</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Critical Alerts</p>
                <p className="text-sm text-muted-foreground">Wound worsening, infection signs</p>
              </div>
              <Switch
                checked={notifications.criticalAlerts}
                onCheckedChange={(checked) => 
                  setNotifications(prev => ({ ...prev, criticalAlerts: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Missed Uploads</p>
                <p className="text-sm text-muted-foreground">When patients miss scheduled uploads</p>
              </div>
              <Switch
                checked={notifications.missedUploads}
                onCheckedChange={(checked) => 
                  setNotifications(prev => ({ ...prev, missedUploads: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Weekly Reports</p>
                <p className="text-sm text-muted-foreground">Summary of patient progress</p>
              </div>
              <Switch
                checked={notifications.weeklyReports}
                onCheckedChange={(checked) => 
                  setNotifications(prev => ({ ...prev, weeklyReports: checked }))
                }
              />
            </div>
            <Button onClick={handleSaveNotifications} disabled={saving} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Preferences
            </Button>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Security</CardTitle>
                <CardDescription>Account security options</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full bg-transparent">
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Button 
          variant="destructive" 
          className="w-full"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
