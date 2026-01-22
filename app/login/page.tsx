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
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLanguage } from "@/lib/i18n/context";

export default function LoginPage() {
  const { t } = useLanguage();
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
        // Always use production URL for email confirmations
        // This ensures confirmation emails always point to production, not localhost
        // Even when testing locally, emails should redirect to production
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://podiguard.vercel.app';
        // Redirect to auth callback which will handle routing based on user role
        const emailRedirectTo = `${baseUrl}/auth/callback`;

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo,
            data: {
              role: role,
            },
          },
        });
        if (error) throw error;
        setMessage(t.login.checkEmail);
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Heart className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-semibold text-balance">
            {t.login.title}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {isSignUp
              ? t.login.signUpDescription
              : t.login.signInDescription}
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
                <Label>{t.login.iAmA}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("patient")}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${role === "patient"
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/30"
                      }`}
                  >
                    <Heart className={`h-6 w-6 ${role === "patient" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${role === "patient" ? "text-primary" : "text-muted-foreground"}`}>
                      {t.login.patient}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("clinician")}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${role === "clinician"
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/30"
                      }`}
                  >
                    <Stethoscope className={`h-6 w-6 ${role === "clinician" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${role === "clinician" ? "text-primary" : "text-muted-foreground"}`}>
                      {t.login.clinician}
                    </span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{t.login.email}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t.login.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{t.login.password}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t.login.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSignUp ? t.login.createAccount : t.login.signIn}
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
                ? t.login.alreadyHaveAccount
                : t.login.needAccount}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
