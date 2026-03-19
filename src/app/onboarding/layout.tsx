"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { OnboardingGuard } from "@/components/admin/onboarding-guard";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <OnboardingGuard>
        <div className="min-h-screen bg-[#e8eef4]">{children}</div>
      </OnboardingGuard>
    </AuthGuard>
  );
}
