"use client"

import { ChartTooltipContent } from "@/components/ui/chart"

import { ChartTooltip } from "@/components/ui/chart"

import { ChartContainer } from "@/components/ui/chart"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, TrendingDown, TrendingUp, Calendar, ImageIcon } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"
import Image from "next/image"
import { useLanguage } from "@/lib/i18n/context"

interface UlcerImage {
  id: string
  image_url: string
  created_at: string
  ulcer_size: number | null
  notes: string | null
}

const createClient = getSupabaseBrowserClient;

export default function WoundDetailsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { language } = useLanguage()
  const [images, setImages] = useState<UlcerImage[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState("")
  const [diagnosis, setDiagnosis] = useState("Type 2 Diabetes, Neuropathic Ulcer")

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
        .select("full_name, diagnosis")
        .eq("id", user.id)
        .single()

      if (profile) {
        setUserName(profile.full_name || user.email?.split("@")[0] || "Patient")
        if (profile.diagnosis) setDiagnosis(profile.diagnosis)
      }

      // Get images with ulcer sizes
      const { data: imagesData } = await supabase
        .from("ulcer_images")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })

      // Generate signed URLs for images if needed (for private buckets)
      if (imagesData) {
        const imagesWithUrls = await Promise.all(
          imagesData.map(async (image) => {
            if (!image.image_url) return image;
            
            // Try to extract file path from URL (format: https://...supabase.co/storage/v1/object/public/ulcer-images/user_id/timestamp.jpg)
            // Or if it's already a path: user_id/timestamp.jpg
            let filePath = image.image_url;
            
            // Extract path from full public URL
            const urlMatch = image.image_url.match(/ulcer-images\/(.+)$/);
            if (urlMatch) {
              filePath = urlMatch[1];
            }
            
            // Try to create a signed URL (works for private buckets)
            try {
              const { data: signedData, error: signedError } = await supabase.storage
                .from("ulcer-images")
                .createSignedUrl(filePath, 3600); // 1 hour expiry
              
              if (!signedError && signedData?.signedUrl) {
                console.log("Using signed URL for:", filePath);
                return { ...image, image_url: signedData.signedUrl };
              }
            } catch (err) {
              console.warn("Could not create signed URL, using original:", err);
            }
            
            // Fallback to original URL (works if bucket is public)
            return image;
          })
        );
        setImages(imagesWithUrls);
      } else {
        setImages([]);
      }

      setLoading(false)
    }

    loadData()
  }, [supabase, router])

  // Calculate stats
  const currentSize = images.length > 0 && images[images.length - 1].ulcer_size 
    ? images[images.length - 1].ulcer_size 
    : 4.2
  const firstSize = images.length > 0 && images[0].ulcer_size 
    ? images[0].ulcer_size 
    : 6.5
  const percentChange = firstSize > 0 ? ((firstSize - currentSize) / firstSize * 100).toFixed(1) : 0
  const isImproving = Number(percentChange) > 0

  const locale = language === 'ar' ? 'ar-SA' : 'en-US'
  
  const lastUpload = images.length > 0 
    ? new Date(images[images.length - 1].created_at).toLocaleDateString(locale, { month: "short", day: "numeric" })
    : "No uploads"

  // Prepare chart data
  const chartData = images.length > 0 
    ? images.map(img => ({
        date: new Date(img.created_at).toLocaleDateString(locale, { month: "short", day: "numeric" }),
        size: img.ulcer_size || 5
      }))
    : [
        { date: "Nov 20", size: 6.5 },
        { date: "Dec 5", size: 5.8 },
        { date: "Dec 20", size: 5.0 },
        { date: "Jan 5", size: 4.8 },
        { date: "Jan 20", size: 4.2 },
      ]

  // Prognosis based on improvement
  const getPrognosis = () => {
    if (Number(percentChange) > 30) return { text: "Excellent - Expected healing in 4-6 weeks", color: "text-green-600" }
    if (Number(percentChange) > 15) return { text: "Good - Expected healing in 6-8 weeks", color: "text-green-600" }
    if (Number(percentChange) > 0) return { text: "Moderate - Continue current treatment", color: "text-amber-600" }
    return { text: "Needs attention - Consult healthcare provider", color: "text-red-600" }
  }

  const prognosis = getPrognosis()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      {/* Header */}
      <div className="bg-background border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{userName}</h1>
            <p className="text-sm text-muted-foreground">{diagnosis}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Current Ulcer Size */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Current Ulcer Size</p>
              <p className="text-3xl font-bold text-foreground">{currentSize} cm²</p>
              <div className={`flex items-center gap-1 mt-2 ${isImproving ? "text-green-600" : "text-red-600"}`}>
                {isImproving ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                <span className="text-sm font-medium">{percentChange}% {isImproving ? "decrease" : "increase"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Last Upload */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Last Upload</p>
              <p className="text-3xl font-bold text-foreground">{lastUpload}</p>
              <div className="flex items-center gap-1 mt-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">{images.length} total images</span>
              </div>
            </CardContent>
          </Card>

          {/* Predicted Prognosis */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Predicted Prognosis</p>
              <p className={`text-base font-semibold mt-3 ${prognosis.color}`}>
                {prognosis.text}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Ulcer Size Progression Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Ulcer Size Progression</CardTitle>
            <CardDescription>Track healing over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
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
                    domain={[0, 'auto']}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}
                    formatter={(value: number) => [`${value} cm²`, 'Size']}
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

        {/* Wound Images Grid */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Wound Images</h2>
          {images.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {images.slice().reverse().map((image) => (
                <button
                  key={image.id}
                  onClick={() => router.push(`/dashboard/analysis/${image.id}`)}
                  className="relative aspect-square rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all"
                >
                  <Image
                    src={image.image_url || "/placeholder.svg"}
                    alt={`Wound image from ${new Date(image.created_at).toLocaleDateString(locale)}`}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      console.error("Image load error:", image.image_url);
                      e.currentTarget.src = "/placeholder.svg";
                    }}
                    unoptimized
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-xs text-white font-medium">
                      {new Date(image.created_at).toLocaleDateString(locale, { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ImageIcon className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-center">No wound images yet</p>
                <Button className="mt-4" onClick={() => router.push("/dashboard/capture")}>
                  Take First Photo
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
