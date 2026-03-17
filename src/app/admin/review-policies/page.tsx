"use client";

import { useAdminConfig } from "@/hooks/use-admin-api";
import { SaveBar, MessageBanner } from "@/components/admin/save-bar";
import { SectionCard } from "@/components/admin/section-card";
import { ReviewPolicyEditor } from "@/components/admin/review-policy-editor";
import { DraftBanner } from "@/components/admin/draft-banner";
import { DEFAULT_REVIEW_POLICIES, type ReviewPolicy } from "@/lib/taxonomy-defaults";
import { Loader2 } from "lucide-react";

export default function ReviewPoliciesPage() {
  const {
    data: policies, setData: setPolicies, loading, saving, message,
    save, saveAsDraft, reset, hasDraft, draftInfo, publishDraft, discardDraft,
  } = useAdminConfig<ReviewPolicy[]>(
    "reviewPolicies",
    "/api/admin/review-policies",
    DEFAULT_REVIEW_POLICIES,
    (c) => Array.isArray(c.reviewPolicies) ? c.reviewPolicies : null
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#1976d2]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#1a2a3a]">Review Policies</h2>
          <p className="text-xs text-[#667781] mt-0.5">Define staleness thresholds per content type. Documents exceeding these limits will display warnings to users.</p>
        </div>
        <SaveBar saving={saving} onSave={save} onReset={() => reset([...DEFAULT_REVIEW_POLICIES])} resetLabel="Reset" onSaveAsDraft={saveAsDraft} />
      </div>
      <MessageBanner message={message} />
      {hasDraft && draftInfo && (
        <DraftBanner
          authorName={draftInfo.authorName}
          createdAt={draftInfo.createdAt}
          onPublish={publishDraft}
          onDiscard={discardDraft}
        />
      )}

      <SectionCard
        title="Staleness Rules"
        description={<><strong>Max Age:</strong> Documents not updated within this period are flagged as stale.<br /><strong>Warn Before:</strong> Warning shown this many days before the document hits the stale threshold.</>}
      >
        <ReviewPolicyEditor policies={policies} onChange={setPolicies} />
      </SectionCard>
    </div>
  );
}
