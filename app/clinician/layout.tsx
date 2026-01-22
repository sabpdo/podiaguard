"use client"

import React from "react";
import { ClinicianNav } from "@/components/clinician-nav";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function ClinicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>
      <main className="flex-1 pb-20">{children}</main>
      <ClinicianNav />
    </div>
  );
}
