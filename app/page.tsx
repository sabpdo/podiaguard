import { redirect } from "next/navigation";
import {
  getSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default async function HomePage() {
  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Setup Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Please connect your Supabase integration to get started with the
              Foot Ulcer Management app.
            </p>
            <p className="text-sm text-muted-foreground">
              Click the &quot;Connect&quot; button in the sidebar to set up
              Supabase, then run the database migration scripts.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Check if user has agreed to privacy policy
    const { data: profile } = await supabase
      .from("profiles")
      .select("privacy_agreed")
      .eq("id", user.id)
      .single();

    if (profile?.privacy_agreed) {
      redirect("/dashboard");
    } else {
      redirect("/privacy-agreement");
    }
  }

  redirect("/login");
}
