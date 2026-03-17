"use client";

import { useAdminConfig } from "@/hooks/use-admin-api";
import { SaveBar, MessageBanner } from "@/components/admin/save-bar";
import { SectionCard } from "@/components/admin/section-card";
import { KeywordEditor } from "@/components/admin/keyword-editor";
import { DraftBanner } from "@/components/admin/draft-banner";
import { DEFAULT_KEYWORDS, type KeywordGroup } from "@/lib/taxonomy-defaults";
import { Loader2 } from "lucide-react";

export default function KeywordsPage() {
  const {
    data: keywords, setData: setKeywords, loading, saving, message,
    save, saveAsDraft, reset, hasDraft, draftInfo, publishDraft, discardDraft,
  } = useAdminConfig<KeywordGroup[]>(
    "keywords",
    "/api/admin/keywords",
    DEFAULT_KEYWORDS,
    (c) => Array.isArray(c.keywords) ? c.keywords : null
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
          <h2 className="text-lg font-semibold text-[#1a2a3a]">Keywords & Synonyms</h2>
          <p className="text-xs text-[#667781] mt-0.5">Define keyword groups with synonyms to improve search relevance and AI grounding.</p>
        </div>
        <SaveBar saving={saving} onSave={save} onReset={() => reset([...DEFAULT_KEYWORDS])} resetLabel="Reset" onSaveAsDraft={saveAsDraft} />
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
        title="Synonym Groups"
        description="When a user searches for any synonym, the system expands the query to include the canonical term and all related synonyms. This improves search recall and helps the AI understand domain-specific terminology."
      >
        <KeywordEditor groups={keywords} onChange={setKeywords} />
      </SectionCard>
    </div>
  );
}
