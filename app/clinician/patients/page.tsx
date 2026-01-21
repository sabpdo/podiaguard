"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft,
  Search,
  TrendingUp, 
  TrendingDown,
  ChevronRight,
  Loader2,
  Filter
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import Loading from "./loading";

interface Patient {
  id: string;
  full_name: string;
  email: string;
  condition: string;
  last_upload: string | null;
  wound_trend: "improving" | "stable" | "worsening";
  current_size: number;
  alerts_count: number;
}

export default function PatientsPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filter, setFilter] = useState<"all" | "improving" | "stable" | "worsening">("all");

  useEffect(() => {
    async function loadPatients() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Mock patient data - in production, query from database
      setPatients([
        {
          id: "1",
          full_name: "John Smith",
          email: "john.smith@example.com",
          condition: "Type 2 Diabetes, Neuropathic Ulcer",
          last_upload: new Date().toISOString(),
          wound_trend: "improving",
          current_size: 4.2,
          alerts_count: 0,
        },
        {
          id: "2",
          full_name: "Mary Johnson",
          email: "mary.j@example.com",
          condition: "Peripheral Arterial Disease",
          last_upload: new Date(Date.now() - 86400000).toISOString(),
          wound_trend: "stable",
          current_size: 3.8,
          alerts_count: 1,
        },
        {
          id: "3",
          full_name: "Robert Davis",
          email: "r.davis@example.com",
          condition: "Diabetic Foot Ulcer",
          last_upload: new Date(Date.now() - 172800000).toISOString(),
          wound_trend: "worsening",
          current_size: 5.1,
          alerts_count: 2,
        },
        {
          id: "4",
          full_name: "Patricia Wilson",
          email: "p.wilson@example.com",
          condition: "Venous Leg Ulcer",
          last_upload: new Date(Date.now() - 259200000).toISOString(),
          wound_trend: "improving",
          current_size: 2.9,
          alerts_count: 0,
        },
        {
          id: "5",
          full_name: "Michael Brown",
          email: "m.brown@example.com",
          condition: "Pressure Ulcer",
          last_upload: new Date(Date.now() - 345600000).toISOString(),
          wound_trend: "stable",
          current_size: 3.2,
          alerts_count: 0,
        },
      ]);

      setLoading(false);
    }
    loadPatients();
  }, [supabase, router]);

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch = patient.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" || patient.wound_trend === filter;
    return matchesSearch && matchesFilter;
  });

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

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "improving":
        return "text-green-600 bg-green-50";
      case "worsening":
        return "text-red-600 bg-red-50";
      default:
        return "text-amber-600 bg-amber-50";
    }
  };

  if (loading) {
    return <Loading />;
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
            <h1 className="text-xl font-semibold text-foreground">Patients</h1>
            <p className="text-sm text-muted-foreground">{patients.length} total patients</p>
          </div>
        </div>
      </header>

      <div className="flex-1 p-4 max-w-4xl mx-auto w-full space-y-4">
        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={filter !== "all" ? "default" : "outline"}
            size="icon"
            onClick={() => {
              const filters: Array<"all" | "improving" | "stable" | "worsening"> = 
                ["all", "worsening", "stable", "improving"];
              const currentIndex = filters.indexOf(filter);
              setFilter(filters[(currentIndex + 1) % filters.length]);
            }}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "worsening", "stable", "improving"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Patients List */}
        <div className="space-y-3">
          {filteredPatients.map((patient) => (
            <Card 
              key={patient.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/clinician/patients/${patient.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-semibold text-primary">
                        {patient.full_name.split(" ").map(n => n[0]).join("")}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{patient.full_name}</p>
                      <p className="text-sm text-muted-foreground">{patient.condition}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Last upload: {patient.last_upload 
                          ? new Date(patient.last_upload).toLocaleDateString()
                          : "Never"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${getTrendColor(patient.wound_trend)}`}>
                      {getTrendIcon(patient.wound_trend)}
                      <span className="text-xs font-medium capitalize">{patient.wound_trend}</span>
                    </div>
                    <p className="text-sm font-medium">{patient.current_size} cm²</p>
                    {patient.alerts_count > 0 && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                        {patient.alerts_count} alert{patient.alerts_count > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground ml-2" />
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredPatients.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No patients found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
