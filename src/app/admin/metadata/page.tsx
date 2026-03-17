"use client";

import { useAdminConfig } from "@/hooks/use-admin-api";
import { SaveBar, MessageBanner } from "@/components/admin/save-bar";
import { SectionCard } from "@/components/admin/section-card";
import { EditableList } from "@/components/admin/editable-list";
import { DraftBanner } from "@/components/admin/draft-banner";
import { DEFAULT_TAXONOMY } from "@/lib/taxonomy-defaults";
import { Loader2 } from "lucide-react";

interface Taxonomy {
  department: string[];
  sensitivity: string[];
  status: string[];
}

export default function MetadataPage() {
  const {
    data: taxonomy, setData: setTaxonomy, loading, saving, message,
    save, saveAsDraft, reset, hasDraft, draftInfo, publishDraft, discardDraft,
  } = useAdminConfig<Taxonomy>(
    "taxonomy",
    "/api/admin/taxonomy",
    DEFAULT_TAXONOMY,
    (c) => c.taxonomy as Taxonomy
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
        <h2 className="text-lg font-semibold text-[#1a2a3a]">Metadata</h2>
        <SaveBar saving={saving} onSave={save} onReset={() => reset({ ...DEFAULT_TAXONOMY })} onSaveAsDraft={saveAsDraft} />
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

      <div className="space-y-6">
        <SectionCard title="Department">
          <EditableList
            items={taxonomy.department}
            onChange={(items) => setTaxonomy({ ...taxonomy, department: items })}
            placeholder="Add department..."
          />
        </SectionCard>

        <SectionCard title="Sensitivity">
          <EditableList
            items={taxonomy.sensitivity}
            onChange={(items) => setTaxonomy({ ...taxonomy, sensitivity: items })}
            placeholder="Add sensitivity level..."
          />
        </SectionCard>

        <SectionCard title="Status">
          <EditableList
            items={taxonomy.status}
            onChange={(items) => setTaxonomy({ ...taxonomy, status: items })}
            placeholder="Add status..."
          />
        </SectionCard>
      </div>
    </div>
  );
}
