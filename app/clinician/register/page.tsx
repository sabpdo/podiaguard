"use client";

import React from "react"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Stethoscope, Shield } from "lucide-react";

export default function ClinicianRegisterPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    licenseNumber: "",
    specialty: "",
    institution: "",
    agreeToTerms: false,
  });

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      }
    }
    checkAuth();
  }, [supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!formData.agreeToTerms) {
      setError("You must agree to the terms and conditions");
      setIsLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update user metadata with clinician details
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: formData.fullName,
          license_number: formData.licenseNumber,
          specialty: formData.specialty,
          institution: formData.institution,
          clinician_verified: false, // Will be verified by admin
          registration_complete: true,
        },
      });

      if (updateError) throw updateError;

      // Redirect to clinician dashboard
      router.push("/clinician");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-primary/5 to-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Stethoscope className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Clinician Registration</CardTitle>
          <CardDescription>
            Complete your professional profile to access the clinician portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="Dr. Jane Smith"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="licenseNumber">Medical License Number</Label>
              <Input
                id="licenseNumber"
                placeholder="e.g., MD12345678"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="specialty">Specialty</Label>
              <Input
                id="specialty"
                placeholder="e.g., Wound Care, Podiatry, Endocrinology"
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="institution">Institution/Practice</Label>
              <Input
                id="institution"
                placeholder="e.g., City Medical Center"
                value={formData.institution}
                onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                required
              />
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Your credentials will be verified before you can access patient data. 
                  This typically takes 1-2 business days.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="agreeToTerms"
                checked={formData.agreeToTerms}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, agreeToTerms: checked === true })
                }
              />
              <Label htmlFor="agreeToTerms" className="text-sm font-normal cursor-pointer">
                I agree to the HIPAA compliance terms and professional conduct guidelines
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Registration
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
