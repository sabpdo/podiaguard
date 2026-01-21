"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  LogOut,
  Loader2,
  ChevronRight,
  Clock
} from "lucide-react";

interface PatientSummary {
  id: string;
  full_name: string;
  last_upload: string | null;
  wound_trend: "improving" | "stable" | "worsening";
  alerts_count: number;
}

export default function ClinicianDashboard() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [user, setUser] = useState<{ email?: string; user_metadata?: { full_name?: string } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatients: 0,
    criticalAlerts: 0,
    improvingCount: 0,
    needsAttention: 0,
  });
  const [recentPatients, setRecentPatients] = useState<PatientSummary[]>([]);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);

      // Mock data for demonstration - in production, query from database
      setStats({
        totalPatients: 24,
        criticalAlerts: 3,
        improvingCount: 18,
        needsAttention: 6,
      });

      setRecentPatients([
        {
          id: "1",
          full_name: "John Smith",
          last_upload: new Date().toISOString(),
          wound_trend: "improving",
          alerts_count: 0,
        },
        {
          id: "2", 
          full_name: "Mary Johnson",
          last_upload: new Date(Date.now() - 86400000).toISOString(),
          wound_trend: "stable",
          alerts_count: 1,
        },
        {
          id: "3",
          full_name: "Robert Davis",
          last_upload: new Date(Date.now() - 172800000).toISOString(),
          wound_trend: "worsening",
          alerts_count: 2,
        },
      ]);

      setLoading(false);
    }
    loadData();
  }, [supabase, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingDown className="h-4 w-4 text-green-600" />;
      case "worsening":
        return <TrendingUp className="h-4 w-4 text-red-600" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-amber-500" />;
    }
  };

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case "improving":
        return <span className="text-green-600 text-sm">Improving</span>;
      case "worsening":
        return <span className="text-red-600 text-sm">Needs Review</span>;
      default:
        return <span className="text-amber-600 text-sm">Stable</span>;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card">
        <div className="flex items-center justify-between p-4 max-w-4xl mx-auto">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Clinician Portal
            </h1>
            <p className="text-sm text-muted-foreground">
              Welcome, Dr. {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex-1 p-4 max-w-4xl mx-auto w-full space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalPatients}</p>
                  <p className="text-xs text-muted-foreground">Total Patients</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-100">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-700">{stats.criticalAlerts}</p>
                  <p className="text-xs text-red-600">Critical Alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100">
                  <TrendingDown className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-700">{stats.improvingCount}</p>
                  <p className="text-xs text-muted-foreground">Improving</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-100">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-700">{stats.needsAttention}</p>
                  <p className="text-xs text-muted-foreground">Needs Attention</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Patients */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <CardDescription>Patients with recent uploads</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push("/clinician/patients")}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentPatients.map((patient) => (
              <button
                key={patient.id}
                onClick={() => router.push(`/clinician/patients/${patient.id}`)}
                className="w-full flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {patient.full_name.split(" ").map(n => n[0]).join("")}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{patient.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Last upload: {patient.last_upload 
                        ? new Date(patient.last_upload).toLocaleDateString()
                        : "Never"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {getTrendIcon(patient.wound_trend)}
                    {getTrendLabel(patient.wound_trend)}
                  </div>
                  {patient.alerts_count > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                      {patient.alerts_count}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col gap-2 bg-transparent"
            onClick={() => router.push("/clinician/alerts")}
          >
            <AlertTriangle className="h-5 w-5" />
            <span>View Alerts</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col gap-2 bg-transparent"
            onClick={() => router.push("/clinician/patients")}
          >
            <Users className="h-5 w-5" />
            <span>All Patients</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
