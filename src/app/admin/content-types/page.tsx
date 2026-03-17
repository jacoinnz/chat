"use client";

import { useAdminConfig } from "@/hooks/use-admin-api";
import { SaveBar, MessageBanner } from "@/components/admin/save-bar";
import { SectionCard } from "@/components/admin/section-card";
import { EditableList } from "@/components/admin/editable-list";
import { DraftBanner } from "@/components/admin/draft-banner";
import { DEFAULT_CONTENT_TYPES } from "@/lib/taxonomy-defaults";
import { Loader2 } from "lucide-react";

export default function ContentTypesPage() {
  const {
    data: contentTypes, setData: setContentTypes, loading, saving, message,
    save, saveAsDraft, reset, hasDraft, draftInfo, publishDraft, discardDraft,
  } = useAdminConfig<string[]>(
    "contentTypes",
    "/api/admin/content-types",
    DEFAULT_CONTENT_TYPES,
    (c) => c.contentTypes as string[]
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
        <h2 className="text-lg font-semibold text-[#1a2a3a]">Content Types</h2>
        <SaveBar saving={saving} onSave={save} onReset={() => reset([...DEFAULT_CONTENT_TYPES])} onSaveAsDraft={saveAsDraft} />
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
        title="SharePoint Content Types"
        description="Content types available in the filter bar. These should match the content types used in your SharePoint document libraries."
      >
        <EditableList
          items={contentTypes}
          onChange={setContentTypes}
          placeholder="Add content type..."
        />
      </SectionCard>
    </div>
  );
}
