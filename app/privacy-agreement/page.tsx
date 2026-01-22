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

export default function PrivacyAgreementPage() {
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
            Privacy Agreement
          </CardTitle>
          <CardDescription>
            Please read and accept our privacy policy to continue
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
                1. Information We Collect
              </h3>
              <p>
                We collect personal health information including photographs of
                your foot ulcers, notes about your condition, and account
                information such as your email address. This information is
                essential for providing you with personalized wound care
                management.
              </p>

              <h3 className="font-semibold text-foreground">
                2. How We Use Your Information
              </h3>
              <p>
                Your health information is used to track your wound healing
                progress, provide personalized notifications about wound care,
                and help you and your healthcare providers make informed
                decisions about your treatment.
              </p>

              <h3 className="font-semibold text-foreground">
                3. Data Security
              </h3>
              <p>
                We implement industry-standard security measures to protect your
                personal health information. All data is encrypted in transit
                and at rest. Access to your information is strictly limited to
                authorized personnel.
              </p>

              <h3 className="font-semibold text-foreground">
                4. Your Rights
              </h3>
              <p>
                You have the right to access, modify, or delete your personal
                information at any time. You can request a copy of all your data
                or request complete deletion of your account through the app
                settings.
              </p>

              <h3 className="font-semibold text-foreground">
                5. Data Sharing
              </h3>
              <p>
                We do not sell or share your personal health information with
                third parties for marketing purposes. Your data may only be
                shared with healthcare providers you explicitly authorize.
              </p>

              <h3 className="font-semibold text-foreground">
                6. HIPAA Compliance
              </h3>
              <p>
                This application is designed to comply with the Health Insurance
                Portability and Accountability Act (HIPAA). We maintain strict
                protocols to ensure the confidentiality, integrity, and
                availability of your protected health information.
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
              I have read and agree to the Privacy Policy. I understand how my
              personal health information will be collected, used, and
              protected.
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
            Accept and Continue
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
