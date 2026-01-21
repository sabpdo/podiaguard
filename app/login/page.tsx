"use client";

import React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Heart, Stethoscope } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [role, setRole] = useState<"patient" | "clinician">("patient");
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const redirectPath = role === "clinician" ? "/clinician/register" : "/privacy-agreement";
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo:
              process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
              `${window.location.origin}${redirectPath}`,
            data: {
              role: role,
            },
          },
        });
        if (error) throw error;
        setMessage("Check your email for the confirmation link!");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        // Route based on user role stored in metadata
        const userRole = data.user?.user_metadata?.role || "patient";
        if (userRole === "clinician") {
          router.push("/clinician");
        } else {
          router.push("/privacy-agreement");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Heart className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-semibold text-balance">
            Foot Ulcer Care
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {isSignUp
              ? "Create an account to start managing your care"
              : "Sign in to manage your foot ulcer care"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {message && (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
            
            {isSignUp && (
              <div className="flex flex-col gap-2">
                <Label>I am a...</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("patient")}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                      role === "patient"
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/30"
                    }`}
                  >
                    <Heart className={`h-6 w-6 ${role === "patient" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${role === "patient" ? "text-primary" : "text-muted-foreground"}`}>
                      Patient
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("clinician")}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                      role === "clinician"
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/30"
                    }`}
                  >
                    <Stethoscope className={`h-6 w-6 ${role === "clinician" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${role === "clinician" ? "text-primary" : "text-muted-foreground"}`}>
                      Clinician
                    </span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSignUp ? "Create Account" : "Sign In"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setMessage(null);
              }}
            >
              {isSignUp
                ? "Already have an account? Sign In"
                : "Need an account? Sign Up"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
