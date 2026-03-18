"use client";

import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { useAdminSave } from "@/hooks/use-admin-api";
import { SectionCard } from "@/components/admin/section-card";
import { MessageBanner } from "@/components/admin/save-bar";
import { Loader2 } from "lucide-react";

export default function FeatureFlagsPage() {
  const { flags, loading, refetch } = useFeatureFlags();
  const { save, saving, message, clearMessage } = useAdminSave();

  const handleToggle = async (name: string, currentEnabled: boolean) => {
    const ok = await save(
      "/api/admin/feature-flags",
      { name, enabled: !currentEnabled },
      `Flag "${name}" ${!currentEnabled ? "enabled" : "disabled"}`
    );
    if (ok) refetch();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold text-[#1a2a3a]">Feature Flags</h2>
        <p className="text-sm text-[#667781] mt-1">
          Enable or disable features for this tenant. Changes take effect immediately.
        </p>
      </div>

      {message && <MessageBanner message={message} />}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#1976d2]" />
        </div>
      ) : (
        <div className="space-y-4">
          {flags.map((flag) => (
            <SectionCard key={flag.name} title={flag.name}>
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#667781] flex-1">{flag.description}</p>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleToggle(flag.name, flag.enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4 ${
                    flag.enabled ? "bg-[#1976d2]" : "bg-[#d0d8e0]"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      flag.enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
