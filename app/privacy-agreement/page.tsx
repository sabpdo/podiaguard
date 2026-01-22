"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLanguage } from "@/lib/i18n/context";

export default function PrivacyAgreementPage() {
  const { t } = useLanguage();
  const [accepted, setAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAgreement, setCheckingAgreement] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    const checkPrivacyAgreement = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("privacy_agreed")
        .eq("id", user.id)
        .single();

      if (profile?.privacy_agreed) {
        router.push("/dashboard");
      }
      setCheckingAgreement(false);
    };

    checkPrivacyAgreement();
  }, [router, supabase]);

  const handleAccept = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          privacy_agreed: true,
          privacy_agreed_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) throw updateError;
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingAgreement) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-semibold text-balance">
            {t.privacy.title}
          </CardTitle>
          <CardDescription>
            {t.privacy.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <ScrollArea className="h-64 rounded-md border p-4">
            <div className="flex flex-col gap-4 text-sm text-muted-foreground leading-relaxed">
              <h3 className="font-semibold text-foreground">
                {t.privacy.section1Title}
              </h3>
              <p>
                {t.privacy.section1Content}
              </p>

              <h3 className="font-semibold text-foreground">
                {t.privacy.section2Title}
              </h3>
              <p>
                {t.privacy.section2Content}
              </p>

              <h3 className="font-semibold text-foreground">
                {t.privacy.section3Title}
              </h3>
              <p>
                {t.privacy.section3Content}
              </p>

              <h3 className="font-semibold text-foreground">
                {t.privacy.section4Title}
              </h3>
              <p>
                {t.privacy.section4Content}
              </p>

              <h3 className="font-semibold text-foreground">
                {t.privacy.section5Title}
              </h3>
              <p>
                {t.privacy.section5Content}
              </p>

              <h3 className="font-semibold text-foreground">
                {t.privacy.section6Title}
              </h3>
              <p>
                {t.privacy.section6Content}
              </p>
            </div>
          </ScrollArea>
          <div className="flex items-start gap-3 pt-2">
            <Checkbox
              id="accept"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
            />
            <label
              htmlFor="accept"
              className="text-sm leading-relaxed cursor-pointer"
            >
              {t.privacy.agreementText}
            </label>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleAccept}
            className="w-full"
            disabled={!accepted || isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t.privacy.acceptButton}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
