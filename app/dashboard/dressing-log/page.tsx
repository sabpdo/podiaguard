"use client"

import { ChartContainer } from "@/components/ui/chart"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Flame, Plus, Check, Calendar } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts"

interface DressingLog {
  id: string
  created_at: string
  notes: string | null
}

export default function DressingLogPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [logs, setLogs] = useState<DressingLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [streak, setStreak] = useState(0)
  const [todayLogged, setTodayLogged] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push("/login")
      return
    }

    // Get dressing logs
    const { data: logsData } = await supabase
      .from("dressing_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (logsData) {
      setLogs(logsData)
      calculateStreak(logsData)
      
      // Check if logged today
      const today = new Date().toDateString()
      const loggedToday = logsData.some(log => 
        new Date(log.created_at).toDateString() === today
      )
      setTodayLogged(loggedToday)
    }

    setLoading(false)
  }

  function calculateStreak(logsData: DressingLog[]) {
    if (logsData.length === 0) {
      setStreak(0)
      return
    }

    let currentStreak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get unique dates
    const uniqueDates = [...new Set(logsData.map(log => 
      new Date(log.created_at).toDateString()
    ))].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

    for (let i = 0; i < uniqueDates.length; i++) {
      const logDate = new Date(uniqueDates[i])
      logDate.setHours(0, 0, 0, 0)
      
      const expectedDate = new Date(today)
      expectedDate.setDate(today.getDate() - i)
      expectedDate.setHours(0, 0, 0, 0)

      if (logDate.getTime() === expectedDate.getTime()) {
        currentStreak++
      } else if (i === 0 && logDate.getTime() === expectedDate.getTime() - 86400000) {
        // Allow for yesterday if today hasn't been logged yet
        currentStreak++
      } else {
        break
      }
    }

    setStreak(currentStreak)
  }

  async function handleLogDressing() {
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from("dressing_logs")
      .insert({
        user_id: user.id,
        notes: notes || null
      })

    if (!error) {
      setNotes("")
      setShowAddForm(false)
      loadData()
    }

    setSubmitting(false)
  }

  // Prepare chart data for last 7 days
  const getWeekData = () => {
    const data = []
    const today = new Date()
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const dateStr = date.toDateString()
      
      const logged = logs.some(log => 
        new Date(log.created_at).toDateString() === dateStr
      )
      
      data.push({
        day: date.toLocaleDateString("en-US", { weekday: "short" }),
        logged: logged ? 1 : 0,
        isToday: i === 0
      })
    }
    
    return data
  }

  const weekData = getWeekData()

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
            <h1 className="text-xl font-semibold text-foreground">Dressing Log</h1>
            <p className="text-sm text-muted-foreground">Track your wound dressing changes</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Streak Card */}
        <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm mb-1">Current Streak</p>
                <div className="flex items-center gap-2">
                  <Flame className="h-8 w-8" />
                  <span className="text-4xl font-bold">{streak}</span>
                  <span className="text-xl">day{streak !== 1 ? "s" : ""}</span>
                </div>
                <p className="text-orange-100 text-sm mt-2">
                  {streak > 0 ? "Keep up the great work!" : "Start your streak today!"}
                </p>
              </div>
              {!todayLogged && (
                <Button 
                  variant="secondary" 
                  size="lg"
                  className="bg-white text-orange-600 hover:bg-orange-50"
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Log Today
                </Button>
              )}
              {todayLogged && (
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
                  <Check className="h-5 w-5" />
                  <span>Done today!</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add Dressing Form */}
        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Log Dressing Change</CardTitle>
              <CardDescription>Record when you changed your wound dressing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Optional notes (e.g., wound appearance, any concerns...)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button 
                  onClick={handleLogDressing} 
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? "Logging..." : "Log Dressing Change"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weekly Overview Chart */}
        <Card>
          <CardHeader>
            <CardTitle>This Week</CardTitle>
            <CardDescription>Your dressing change activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[150px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis hide domain={[0, 1]} />
                  <Bar dataKey="logged" radius={[4, 4, 4, 4]} maxBarSize={40}>
                    {weekData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        fill={entry.logged ? "hsl(142, 76%, 36%)" : "#e5e7eb"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-600" />
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-gray-200" />
                <span>Missed</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Logs</CardTitle>
            <CardDescription>Your dressing change history</CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length > 0 ? (
              <div className="space-y-3">
                {logs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground">
                        {new Date(log.created_at).toLocaleDateString("en-US", { 
                          weekday: "long", 
                          month: "short", 
                          day: "numeric",
                          year: "numeric"
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleTimeString("en-US", { 
                          hour: "numeric", 
                          minute: "2-digit" 
                        })}
                      </p>
                      {log.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{log.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No dressing changes logged yet</p>
                <Button className="mt-4" onClick={() => setShowAddForm(true)}>
                  Log Your First Change
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
