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
import { useLanguage } from "@/lib/i18n/context"

interface DressingLog {
  id: string
  created_at: string
  notes: string | null
}

export default function DressingLogPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { t, language } = useLanguage()
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
    const locale = language === 'ar' ? 'ar-SA' : 'en-US'
    
    // Short Arabic day names (without ال prefix for compact display)
    const arabicDayShort: string[] = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const dateStr = date.toDateString()
      
      const logged = logs.some(log => 
        new Date(log.created_at).toDateString() === dateStr
      )
      
      let dayLabel: string
      if (language === 'ar') {
        // Use day of week index (0 = Sunday, 6 = Saturday) for Arabic short names
        const dayIndex = date.getDay()
        dayLabel = arabicDayShort[dayIndex]
      } else {
        dayLabel = date.toLocaleDateString(locale, { weekday: "short" })
      }
      
      data.push({
        day: dayLabel,
        logged: logged ? 1 : 0,
        isToday: i === 0
      })
    }
    
    return data
  }

  const weekData = getWeekData()
  const locale = language === 'ar' ? 'ar-SA' : 'en-US'

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
            <h1 className="text-xl font-semibold text-foreground">{t.dressingLog.title}</h1>
            <p className="text-sm text-muted-foreground">{t.dressingLog.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Streak Card */}
        <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm mb-1">{t.dressingLog.currentStreak}</p>
                <div className="flex items-center gap-2">
                  <Flame className="h-8 w-8" />
                  <span className="text-4xl font-bold">{streak}</span>
                  <span className="text-xl">{streak !== 1 ? t.dressingLog.days : t.dressingLog.day}</span>
                </div>
                <p className="text-orange-100 text-sm mt-2">
                  {streak > 0 ? t.dressingLog.keepUpGreatWork : t.dressingLog.startStreakToday}
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
                  {t.dressingLog.logToday}
                </Button>
              )}
              {todayLogged && (
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
                  <Check className="h-5 w-5" />
                  <span>{t.dressingLog.doneToday}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add Dressing Form */}
        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t.dressingLog.logDressingChange}</CardTitle>
              <CardDescription>{t.dressingLog.logDressingChangeDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder={t.dressingLog.notesPlaceholder}
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
                  {submitting ? t.dressingLog.logging : t.dressingLog.logDressingChangeButton}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddForm(false)}
                >
                  {t.dressingLog.cancel}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weekly Overview Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t.dressingLog.thisWeek}</CardTitle>
            <CardDescription>{t.dressingLog.thisWeekDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[140px] w-full overflow-hidden" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={weekData} 
                  margin={{ 
                    top: 2, 
                    right: language === 'ar' ? 0 : 2, 
                    left: language === 'ar' ? 0 : 2, 
                    bottom: language === 'ar' ? 35 : 2 
                  }}
                  barCategoryGap={language === 'ar' ? "20%" : "15%"}
                >
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: language === 'ar' ? 7 : 10 }}
                    tickLine={false}
                    axisLine={false}
                    angle={language === 'ar' ? -45 : 0}
                    textAnchor={language === 'ar' ? 'end' : 'middle'}
                    height={language === 'ar' ? 35 : 20}
                    interval={0}
                    style={{ fontSize: language === 'ar' ? '7px' : '10px' }}
                  />
                  <YAxis hide domain={[0, 1]} width={0} />
                  <Bar dataKey="logged" radius={[3, 3, 3, 3]} maxBarSize={language === 'ar' ? 18 : 30}>
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
                <span>{t.dressingLog.completed}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-gray-200" />
                <span>{t.dressingLog.missed}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Logs */}
        <Card>
          <CardHeader>
            <CardTitle>{t.dressingLog.recentLogs}</CardTitle>
            <CardDescription>{t.dressingLog.recentLogsDescription}</CardDescription>
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
                        {new Date(log.created_at).toLocaleDateString(locale, { 
                          weekday: "long", 
                          month: "short", 
                          day: "numeric",
                          year: "numeric"
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleTimeString(locale, { 
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
                <p className="text-muted-foreground">{t.dressingLog.noLogsYet}</p>
                <Button className="mt-4" onClick={() => setShowAddForm(true)}>
                  {t.dressingLog.logFirstChange}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
