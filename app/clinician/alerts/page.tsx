"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  Loader2
} from "lucide-react";

interface Alert {
  id: string;
  patient_name: string;
  patient_id: string;
  type: "wound_worsening" | "missed_upload" | "missed_dressing";
  message: string;
  severity: "high" | "medium" | "low";
  created_at: string;
  acknowledged: boolean;
}

export default function AlertsPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    async function loadAlerts() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Mock alert data - in production, query from database
      setAlerts([
        {
          id: "1",
          patient_name: "Robert Davis",
          patient_id: "3",
          type: "wound_worsening",
          message: "Wound size increased by 15% over the past week",
          severity: "high",
          created_at: new Date().toISOString(),
          acknowledged: false,
        },
        {
          id: "2",
          patient_name: "Mary Johnson",
          patient_id: "2",
          type: "missed_upload",
          message: "No wound photo uploaded in the last 3 days",
          severity: "medium",
          created_at: new Date(Date.now() - 86400000).toISOString(),
          acknowledged: false,
        },
        {
          id: "3",
          patient_name: "Robert Davis",
          patient_id: "3",
          type: "missed_dressing",
          message: "Dressing change not logged for 2 days",
          severity: "medium",
          created_at: new Date(Date.now() - 172800000).toISOString(),
          acknowledged: false,
        },
        {
          id: "4",
          patient_name: "John Smith",
          patient_id: "1",
          type: "wound_worsening",
          message: "Signs of infection detected in latest image",
          severity: "high",
          created_at: new Date(Date.now() - 259200000).toISOString(),
          acknowledged: true,
        },
      ]);

      setLoading(false);
    }
    loadAlerts();
  }, [supabase, router]);

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, acknowledged: true } : a
    ));
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "wound_worsening":
        return <TrendingUp className="h-5 w-5" />;
      case "missed_upload":
        return <Clock className="h-5 w-5" />;
      case "missed_dressing":
        return <Clock className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getSeverityStyle = (severity: string, acknowledged: boolean) => {
    if (acknowledged) return "border-muted bg-muted/30 text-muted-foreground";
    switch (severity) {
      case "high":
        return "border-red-200 bg-red-50 text-red-700";
      case "medium":
        return "border-amber-200 bg-amber-50 text-amber-700";
      default:
        return "border-blue-200 bg-blue-50 text-blue-700";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card">
        <div className="flex items-center gap-3 p-4 max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => router.push("/clinician")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Alerts</h1>
            <p className="text-sm text-muted-foreground">
              {unacknowledgedCount} unacknowledged alert{unacknowledgedCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 p-4 max-w-4xl mx-auto w-full space-y-3">
        {alerts.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium">All clear!</p>
            <p className="text-muted-foreground">No alerts at this time</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <Card 
              key={alert.id}
              className={`transition-all ${getSeverityStyle(alert.severity, alert.acknowledged)}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${
                    alert.acknowledged 
                      ? "bg-muted" 
                      : alert.severity === "high" 
                        ? "bg-red-100" 
                        : "bg-amber-100"
                  }`}>
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => router.push(`/clinician/patients/${alert.patient_id}`)}
                        className="font-medium hover:underline text-left"
                      >
                        {alert.patient_name}
                      </button>
                      {!alert.acknowledged && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          alert.severity === "high" 
                            ? "bg-red-200 text-red-800" 
                            : "bg-amber-200 text-amber-800"
                        }`}>
                          {alert.severity.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm mt-1">{alert.message}</p>
                    <p className="text-xs mt-2 opacity-70">
                      {new Date(alert.created_at).toLocaleDateString()} at{" "}
                      {new Date(alert.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {!alert.acknowledged && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
