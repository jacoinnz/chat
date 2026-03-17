"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdminToken, useAdminSave, type DraftInfo } from "@/hooks/use-admin-api";
import { SaveBar, MessageBanner } from "@/components/admin/save-bar";
import { SectionCard } from "@/components/admin/section-card";
import { EditableList } from "@/components/admin/editable-list";
import { KqlMapEditor } from "@/components/admin/kql-map-editor";
import { DraftBanner } from "@/components/admin/draft-banner";
import { DEFAULT_KQL_PROPERTY_MAP, DEFAULT_SEARCH_FIELDS } from "@/lib/taxonomy-defaults";
import { Loader2 } from "lucide-react";

export default function KqlConfigPage() {
  const { getToken } = useAdminToken();
  const [kqlPropertyMap, setKqlPropertyMap] = useState<Record<string, string>>(DEFAULT_KQL_PROPERTY_MAP);
  const [searchFields, setSearchFields] = useState<string[]>(DEFAULT_SEARCH_FIELDS);
  const [loading, setLoading] = useState(true);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftInfo, setDraftInfo] = useState<DraftInfo | null>(null);
  const [fullConfig, setFullConfig] = useState<Record<string, unknown> | null>(null);
  const { save: doSave, saving, message, setMessage } = useAdminSave();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = await getToken();
        const response = await fetch("/api/admin/config", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok && !cancelled) {
          const data = await response.json();
          setKqlPropertyMap(data.kqlPropertyMap as Record<string, string>);
          setSearchFields(data.searchFields as string[]);
          setFullConfig({
            taxonomy: data.taxonomy,
            contentTypes: data.contentTypes,
            kqlPropertyMap: data.kqlPropertyMap,
            searchFields: data.searchFields,
            keywords: data.keywords,
            reviewPolicies: data.reviewPolicies,
            searchBehaviour: data.searchBehaviour,
          });
          if (data.hasDraft) {
            setHasDraft(true);
            setDraftInfo(data.draft);
          }
        }
      } catch {
        // Use defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [getToken]);

  const handleSave = useCallback(async () => {
    const [mapOk, fieldsOk] = await Promise.all([
      doSave("/api/admin/kql-map", { kqlPropertyMap }, "KQL configuration saved successfully"),
      doSave("/api/admin/search-fields", { searchFields }, "KQL configuration saved successfully"),
    ]);
    if (!mapOk || !fieldsOk) {
      setMessage({ type: "error", text: "Failed to save some settings" });
    }
  }, [doSave, kqlPropertyMap, searchFields, setMessage]);

  const handleSaveAsDraft = useCallback(async () => {
    try {
      const token = await getToken();
      const snapshot = { ...fullConfig, kqlPropertyMap, searchFields };
      const response = await fetch("/api/admin/config/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ snapshot }),
      });
      if (response.ok) {
        setMessage({ type: "success", text: "Saved as draft" });
        setHasDraft(true);
      } else {
        setMessage({ type: "error", text: "Failed to save draft" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save draft" });
    }
  }, [getToken, fullConfig, kqlPropertyMap, searchFields, setMessage]);

  const handlePublish = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch("/api/admin/config/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setMessage({ type: "success", text: "Draft published successfully" });
        setHasDraft(false);
        setDraftInfo(null);
      } else {
        setMessage({ type: "error", text: "Failed to publish draft" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to publish draft" });
    }
  }, [getToken, setMessage]);

  const handleDiscard = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch("/api/admin/config/draft", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setMessage({ type: "success", text: "Draft discarded" });
        setHasDraft(false);
        setDraftInfo(null);
      } else {
        setMessage({ type: "error", text: "Failed to discard draft" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to discard draft" });
    }
  }, [getToken, setMessage]);

  const handleReset = useCallback(() => {
    setKqlPropertyMap({ ...DEFAULT_KQL_PROPERTY_MAP });
    setSearchFields([...DEFAULT_SEARCH_FIELDS]);
    setMessage({ type: "success", text: "Reset to defaults (save to apply)" });
  }, [setMessage]);

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
        <h2 className="text-lg font-semibold text-[#1a2a3a]">KQL Configuration</h2>
        <SaveBar saving={saving} onSave={handleSave} onReset={handleReset} onSaveAsDraft={handleSaveAsDraft} />
      </div>
      <MessageBanner message={message} />
      {hasDraft && draftInfo && (
        <DraftBanner
          authorName={draftInfo.authorName}
          createdAt={draftInfo.createdAt}
          onPublish={handlePublish}
          onDiscard={handleDiscard}
        />
      )}

      <SectionCard
        title="KQL Property Map"
        description="Maps filter keys to SharePoint managed property names used in KQL queries. If auto-mapping doesn't work, map your site columns to refinable slots (e.g., Department → RefinableString00)."
      >
        <KqlMapEditor entries={kqlPropertyMap} onChange={setKqlPropertyMap} />
      </SectionCard>

      <SectionCard
        title="Search Fields"
        description="Fields returned by the Graph Search API. Names must match SharePoint site column internal names (PascalCase)."
      >
        <EditableList
          items={searchFields}
          onChange={setSearchFields}
          placeholder="Add search field..."
        />
      </SectionCard>
    </div>
  );
}
