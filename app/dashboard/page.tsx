"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, LogOut, TrendingDown, TrendingUp, Flame, Baseline as ChartLine, Badge as Bandage, Bell, Loader2 } from "lucide-react"
import type { User } from "@supabase/supabase-js"

interface Stats {
  totalPhotos: number
  lastUpload: string | null
  currentSize: number
  percentChange: number
  streak: number
  unreadNotifications: number
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState("")
  const [stats, setStats] = useState<Stats>({
    totalPhotos: 0,
    lastUpload: null,
    currentSize: 4.2,
    percentChange: 35.4,
    streak: 0,
    unreadNotifications: 0
  })

  useEffect(() => {
    async function loadDashboard() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push("/login")
        return
      }
      
      setUser(user)

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, privacy_accepted")
        .eq("id", user.id)
        .single()

      if (profile && !profile.privacy_accepted) {
        router.push("/privacy-agreement")
        return
      }

      setUserName(profile?.full_name || user.email?.split("@")[0] || "Patient")

      // Get stats
      const { data: images } = await supabase
        .from("ulcer_images")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      // Get dressing logs for streak
      const { data: dressingLogs } = await supabase
        .from("dressing_logs")
        .select("created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      // Calculate streak
      let streak = 0
      if (dressingLogs && dressingLogs.length > 0) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const uniqueDates = [...new Set(dressingLogs.map(log => 
          new Date(log.created_at).toDateString()
        ))].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

        for (let i = 0; i < uniqueDates.length; i++) {
          const logDate = new Date(uniqueDates[i])
          logDate.setHours(0, 0, 0, 0)
          const expectedDate = new Date(today)
          expectedDate.setDate(today.getDate() - i)
          expectedDate.setHours(0, 0, 0, 0)
          if (logDate.getTime() === expectedDate.getTime()) {
            streak++
          } else if (i === 0 && logDate.getTime() === expectedDate.getTime() - 86400000) {
            streak++
          } else {
            break
          }
        }
      }

      // Get unread notifications
      const { data: notifs } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("read", false)

      // Calculate wound size change
      let currentSize = 4.2
      let percentChange = 35.4
      if (images && images.length >= 2) {
        const latest = images[0]?.ulcer_size || 4.2
        const oldest = images[images.length - 1]?.ulcer_size || 6.5
        currentSize = latest
        percentChange = oldest > 0 ? ((oldest - latest) / oldest * 100) : 0
      } else if (images && images.length === 1 && images[0].ulcer_size) {
        currentSize = images[0].ulcer_size
      }

      setStats({
        totalPhotos: images?.length || 0,
        lastUpload: images?.[0]?.created_at || null,
        currentSize,
        percentChange,
        streak,
        unreadNotifications: notifs?.length || 0
      })

      setLoading(false)
    }

    loadDashboard()
  }, [supabase, router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const isImproving = stats.percentChange > 0

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      {/* Header */}
      <div className="bg-background border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Welcome, {userName}</h1>
            <p className="text-sm text-muted-foreground">Track your healing progress</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Sign out</span>
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Main Action Button */}
        <Card className="bg-gradient-to-br from-primary to-primary/80 border-0 text-background">
          <CardContent className="flex items-center justify-between p-4 max-w-4xl mx-auto border-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-1">Analyze Your Wound</h2>
                <p className="text-primary-foreground/80 text-sm">
                  Take a photo for AI-powered analysis
                </p>
              </div>
              <Button 
                size="lg" 
                variant="secondary"
                className="gap-2"
                onClick={() => router.push("/dashboard/capture")}
              >
                <Camera className="h-5 w-5" />
                Start Analysis
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          {/* Current Size */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push("/dashboard/wound-details")}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-1">Current Size</p>
              <p className="text-2xl font-bold text-foreground">{stats.currentSize} cm²</p>
              <div className={`flex items-center gap-1 mt-1 ${isImproving ? "text-green-600" : "text-red-600"}`}>
                {isImproving ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                <span className="text-xs font-medium">{Math.abs(stats.percentChange).toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Streak */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push("/dashboard/dressing-log")}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-1">Dressing Streak</p>
              <div className="flex items-center gap-2">
                <Flame className="h-6 w-6 text-orange-500" />
                <span className="text-2xl font-bold text-foreground">{stats.streak}</span>
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* View Progress */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push("/dashboard/wound-details")}
          >
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col items-center text-center">
                <div className="p-3 bg-blue-100 rounded-full mb-2">
                  <ChartLine className="h-6 w-6 text-blue-600" />
                </div>
                <p className="font-medium text-sm text-foreground">View Progress</p>
                <p className="text-xs text-muted-foreground mt-1">See healing trends</p>
              </div>
            </CardContent>
          </Card>

          {/* Log Dressing */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push("/dashboard/dressing-log")}
          >
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col items-center text-center">
                <div className="p-3 bg-green-100 rounded-full mb-2">
                  <Bandage className="h-6 w-6 text-green-600" />
                </div>
                <p className="font-medium text-sm text-foreground">Log Dressing</p>
                <p className="text-xs text-muted-foreground mt-1">Track changes</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications Preview */}
        {stats.unreadNotifications > 0 && (
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow border-amber-200 bg-amber-50"
            onClick={() => router.push("/dashboard/notifications")}
          >
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-full">
                  <Bell className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-foreground">
                    {stats.unreadNotifications} New Notification{stats.unreadNotifications > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">Tap to view reminders and alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>Your latest updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.lastUpload ? (
                <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Camera className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Photo uploaded</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(stats.lastUpload).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit"
                      })}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                  <Button 
                    variant="link" 
                    className="mt-1 h-auto p-0"
                    onClick={() => router.push("/dashboard/capture")}
                  >
                    Take your first photo
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Tips */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daily Reminder</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                Remember to change your wound dressing daily and keep the area clean and dry. 
                Take a photo after each dressing change to track your progress.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
