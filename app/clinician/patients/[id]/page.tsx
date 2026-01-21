"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  Calendar,
  ImageIcon,
  Loader2
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";

interface PatientDetail {
  id: string;
  full_name: string;
  email: string;
  condition: string;
  current_size: number;
  size_change_percent: number;
  last_upload: string;
  total_images: number;
  prognosis: string;
  size_history: { date: string; size: number }[];
  images: { id: string; url: string; date: string; size: number }[];
}

export default function PatientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = getSupabaseBrowserClient();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<PatientDetail | null>(null);

  useEffect(() => {
    async function loadPatient() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Mock patient data - in production, query from database using params.id
      setPatient({
        id: params.id as string,
        full_name: "John Smith",
        email: "john.smith@example.com",
        condition: "Type 2 Diabetes, Neuropathic Ulcer",
        current_size: 4.2,
        size_change_percent: -35.4,
        last_upload: new Date().toISOString(),
        total_images: 5,
        prognosis: "Excellent - Expected healing in 4-6 weeks",
        size_history: [
          { date: "Nov 20", size: 6.5 },
          { date: "Dec 5", size: 5.8 },
          { date: "Dec 20", size: 5.0 },
          { date: "Jan 5", size: 4.8 },
          { date: "Jan 20", size: 4.2 },
        ],
        images: [
          { id: "1", url: "/placeholder.svg?height=200&width=200", date: "Jan 20, 2026", size: 4.2 },
          { id: "2", url: "/placeholder.svg?height=200&width=200", date: "Jan 5, 2026", size: 4.8 },
          { id: "3", url: "/placeholder.svg?height=200&width=200", date: "Dec 20, 2025", size: 5.0 },
          { id: "4", url: "/placeholder.svg?height=200&width=200", date: "Dec 5, 2025", size: 5.8 },
        ],
      });

      setLoading(false);
    }
    loadPatient();
  }, [supabase, router, params.id]);

  if (loading || !patient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isImproving = patient.size_change_percent < 0;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card">
        <div className="flex items-center gap-3 p-4 max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => router.push("/clinician/patients")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{patient.full_name}</h1>
            <p className="text-sm text-muted-foreground">{patient.condition}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 p-4 max-w-4xl mx-auto w-full space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Current Ulcer Size</p>
              <p className="text-2xl font-bold mt-1">{patient.current_size} cm²</p>
              <div className={`flex items-center gap-1 mt-1 ${isImproving ? "text-green-600" : "text-red-600"}`}>
                {isImproving ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <TrendingUp className="h-4 w-4" />
                )}
                <span className="text-sm">{Math.abs(patient.size_change_percent)}% {isImproving ? "decrease" : "increase"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Last Upload</p>
              <p className="text-2xl font-bold mt-1">
                {new Date(patient.last_upload).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
              <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">{patient.total_images} total images</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Predicted Prognosis</p>
              <p className="text-sm font-medium mt-2 text-green-600">{patient.prognosis}</p>
            </CardContent>
          </Card>
        </div>

        {/* Size Progression Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Ulcer Size Progression</CardTitle>
            <CardDescription>Track healing over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={patient.size_history} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                    label={{ value: "Size (cm²)", angle: -90, position: "insideLeft", style: { fontSize: 12 } }}
                    domain={[0, "auto"]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "white", 
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      padding: "8px 12px"
                    }}
                    formatter={(value: number) => [`${value} cm²`, "Size"]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="size" 
                    stroke="hsl(221, 83%, 53%)" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(221, 83%, 53%)", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Wound Images */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Wound Images</CardTitle>
            <CardDescription>Click to view analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {patient.images.map((image) => (
                <button
                  key={image.id}
                  onClick={() => router.push(`/clinician/patients/${patient.id}/analysis/${image.id}`)}
                  className="relative aspect-square rounded-lg overflow-hidden border bg-muted hover:ring-2 hover:ring-primary transition-all group"
                >
                  <Image
                    src={image.url || "/placeholder.svg"}
                    alt={`Wound image from ${image.date}`}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-xs text-white font-medium">{image.date}</p>
                    <p className="text-xs text-white/80">{image.size} cm²</p>
                  </div>
                  <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-primary" />
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
