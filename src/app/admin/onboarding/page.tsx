"use client";

import { useAdminFetch } from "@/hooks/use-admin-api";
import { SectionCard } from "@/components/admin/section-card";
import { Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

interface Check {
  passed: boolean;
  message: string;
}

interface OnboardingData {
  onboardingStatus: string;
  checks: Record<string, Check>;
  allPassed: boolean;
}

const CHECK_LINKS: Record<string, { label: string; href: string }> = {
  graphApi: { label: "Check Azure AD settings", href: "/admin/settings" },
  sharePointSearch: { label: "Verify KQL mapping", href: "/admin/kql-config" },
  aiService: { label: "Set ANTHROPIC_API_KEY", href: "/admin/settings" },
  configExists: { label: "Configure taxonomy", href: "/admin/metadata" },
};

export default function OnboardingPage() {
  const { data, loading, refetch } = useAdminFetch<OnboardingData>("/api/admin/onboarding");

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#1a2a3a]">Tenant Onboarding</h2>
          <p className="text-sm text-[#667781] mt-1">
            Verify that all required services are configured and accessible.
          </p>
        </div>
        <button
          type="button"
          onClick={refetch}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#1976d2] border border-[#1976d2] rounded-md hover:bg-[#e8eef4] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Run Checks
        </button>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#1976d2]" />
        </div>
      ) : data ? (
        <>
          {/* Status banner */}
          <div
            className={`rounded-lg border p-4 ${
              data.allPassed
                ? "bg-green-50 border-green-200"
                : "bg-amber-50 border-amber-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {data.allPassed ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-amber-600" />
              )}
              <span
                className={`text-sm font-medium ${
                  data.allPassed ? "text-green-700" : "text-amber-700"
                }`}
              >
                {data.allPassed
                  ? "All checks passed — tenant is ready for production"
                  : "Some checks failed — action required"}
              </span>
            </div>
          </div>

          {/* Check results */}
          <SectionCard title="Readiness Checks">
            <div className="space-y-3">
              {Object.entries(data.checks).map(([key, check]) => (
                <div
                  key={key}
                  className="flex items-start justify-between py-2 border-b border-[#e8eef4] last:border-0"
                >
                  <div className="flex items-start gap-2">
                    {check.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="text-sm text-[#1a2a3a]">{check.message}</p>
                      {!check.passed && CHECK_LINKS[key] && (
                        <Link
                          href={CHECK_LINKS[key].href}
                          className="text-xs text-[#1976d2] hover:underline mt-0.5 inline-block"
                        >
                          {CHECK_LINKS[key].label}
                        </Link>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      check.passed
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {check.passed ? "PASS" : "FAIL"}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}
