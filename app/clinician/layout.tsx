import React from "react";
import { ClinicianNav } from "@/components/clinician-nav";

export default function ClinicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1 pb-20">{children}</main>
      <ClinicianNav />
    </div>
  );
}
