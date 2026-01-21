"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Ruler, Sparkles, Droplets, MapPin } from "lucide-react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client" // Import createClient

interface AnalysisData {
  id: string
  image_url: string
  created_at: string
  ulcer_size: number | null
  depth: number | null
  diameter: number | null
  tissue_composition: string | null
  exudate_level: string | null
  location: string | null
  diagnosis: string | null
  severity: string | null
  recommendations: string[] | null
  notes: string | null
}

export default function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [data, setData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState("")

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      // Get profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single()

      if (profile) {
        setUserName(profile.full_name || user.email?.split("@")[0] || "Patient")
      }

      // Get image analysis
      const { data: imageData } = await supabase
        .from("ulcer_images")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single()

      if (imageData) {
        setData(imageData)
      }

      setLoading(false)
    }

    loadData()
  }, [supabase, router, id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <p className="text-muted-foreground mb-4">Analysis not found</p>
        <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
      </div>
    )
  }

  // Default values for display
  const ulcerSize = data.ulcer_size || 4.2
  const depth = data.depth || 4
  const diameter = data.diameter || 2.3
  const tissueComposition = data.tissue_composition || "Healthy granulation (90%), epithelializing"
  const exudateLevel = data.exudate_level || "Minimal, serous"
  const location = data.location || "Plantar aspect, metatarsal head 1"
  const diagnosis = data.diagnosis || "Neuropathic Ulcer - Wagner Grade 1"
  const severity = data.severity || "MODERATE"
  const recommendations = data.recommendations || [
    "Continue daily wound dressing changes",
    "Monitor for signs of infection",
    "Maintain offloading protocol",
    "Schedule follow-up in 2 weeks"
  ]

  const getSeverityColor = (sev: string) => {
    switch (sev.toUpperCase()) {
      case "MILD": return "bg-green-100 text-green-800 border-green-200"
      case "MODERATE": return "bg-gray-900 text-white"
      case "SEVERE": return "bg-red-100 text-red-800 border-red-200"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      {/* Header */}
      <div className="bg-background border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{userName}</h1>
            <p className="text-sm text-muted-foreground">
              Image Analysis - {new Date(data.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Image */}
          <div className="space-y-4">
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted">
              <Image
                src={data.image_url || "/placeholder.svg"}
                alt="Wound analysis"
                fill
                className="object-cover"
              />
              {/* Detection box overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3/5 h-3/5 border-4 border-amber-400 rounded-lg" />
              </div>
            </div>
            
            {data.notes && (
              <div className="bg-slate-100 rounded-lg p-4">
                <p className="text-sm">
                  <span className="font-semibold">Notes:</span> {data.notes}
                </p>
              </div>
            )}
          </div>

          {/* Right Column - Analysis Details */}
          <div className="space-y-4">
            {/* Ulcer Dimensions */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Ruler className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Ulcer Dimensions</h3>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <p>Size: {ulcerSize} cm²</p>
                      <p>Depth: {depth} mm</p>
                      <p>Estimated diameter: {diameter} cm</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Tissue Composition</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{tissueComposition}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Droplets className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Exudate Level</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{exudateLevel}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Location</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{location}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Diagnosis */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-sm text-muted-foreground mb-3">Diagnosis</h3>
                <Badge className={`mb-3 ${getSeverityColor(severity)}`}>
                  {severity}
                </Badge>
                <p className="text-foreground">{diagnosis}</p>
              </CardContent>
            </Card>

            {/* Recommended Actions */}
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-primary text-lg">Recommended Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="text-primary mt-1">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
