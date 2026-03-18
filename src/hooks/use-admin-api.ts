"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { graphScopes } from "@/lib/msal-config";
import { useToast } from "@/components/ui/toast";
import { useTokenAcquisition } from "@/hooks/use-token";

// ── Shared token acquisition ────────────────────────────────────────

export function useAdminToken() {
  return useTokenAcquisition(graphScopes.admin);
}

// ── Generic read-only fetch ─────────────────────────────────────────

export function useAdminFetch<T>(
  endpoint: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- config JSON shape varies per endpoint
  options?: { parser?: (data: any) => T; params?: Record<string, string> }
) {
  const { getToken } = useAdminToken();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stabilise options across renders
  const parserRef = useRef(options?.parser);
  parserRef.current = options?.parser;

  const paramsStr = options?.params
    ? "?" + new URLSearchParams(options.params).toString()
    : "";

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const response = await fetch(`${endpoint}${paramsStr}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const json = await response.json();
        setData(parserRef.current ? parserRef.current(json) : json);
      } else {
        setError("Failed to load data");
      }
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [getToken, endpoint, paramsStr]);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

// ── Generic save ────────────────────────────────────────────────────

type Message = { type: "success" | "error"; text: string };

export function useAdminSave() {
  const { getToken } = useAdminToken();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const toasts = useToast();

  const save = useCallback(
    async (
      endpoint: string,
      payload: Record<string, unknown>,
      successMsg = "Saved successfully"
    ): Promise<boolean> => {
      setSaving(true);
      setMessage(null);
      try {
        const token = await getToken();
        const response = await fetch(endpoint, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          setMessage({ type: "success", text: successMsg });
          toasts.success(successMsg);
          return true;
        }
        const data = await response.json().catch(() => ({}));
        const errMsg = data.error || "Failed to save";
        setMessage({ type: "error", text: errMsg });
        toasts.error(errMsg);
        return false;
      } catch {
        setMessage({ type: "error", text: "Failed to save" });
        toasts.error("Failed to save");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [getToken, toasts]
  );

  const clearMessage = useCallback(() => setMessage(null), []);

  return { save, saving, message, setMessage, clearMessage };
}

// ── Combined config hook (load + edit + save + draft support) ────────

export interface DraftInfo {
  version: number;
  authorName: string;
  createdAt: string;
}

export function useAdminConfig<T>(
  section: string,
  saveEndpoint: string,
  defaultValue: T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- config JSON shape varies per section
  parser?: (config: any) => T
) {
  const { getToken } = useAdminToken();
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [draftInfo, setDraftInfo] = useState<DraftInfo | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const { save: doSave, saving, message, setMessage, clearMessage } = useAdminSave();
  const toasts = useToast();

  // Store full config ref for draft snapshots
  const fullConfigRef = useRef<Record<string, unknown> | null>(null);

  // Keep parser stable via ref
  const parserRef = useRef(parser);
  parserRef.current = parser;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = await getToken();
        const response = await fetch("/api/admin/config", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok && !cancelled) {
          const json = await response.json();
          const parsed = parserRef.current ? parserRef.current(json) : (json[section] as T);
          if (parsed != null) setData(parsed);

          // Store full config for drafts
          fullConfigRef.current = {
            taxonomy: json.taxonomy,
            contentTypes: json.contentTypes,
            kqlPropertyMap: json.kqlPropertyMap,
            searchFields: json.searchFields,
            keywords: json.keywords,
            reviewPolicies: json.reviewPolicies,
            searchBehaviour: json.searchBehaviour,
          };

          // Draft metadata
          if (json.hasDraft) {
            setHasDraft(true);
            setDraftInfo(json.draft);
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
  }, [getToken, section]);

  const save = useCallback(async () => {
    await doSave(saveEndpoint, { [section]: data } as Record<string, unknown>);
  }, [doSave, saveEndpoint, section, data]);

  const saveAsDraft = useCallback(async () => {
    try {
      const token = await getToken();
      const snapshot = {
        ...fullConfigRef.current,
        [section]: data,
      };
      const response = await fetch("/api/admin/config/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ snapshot }),
      });
      if (response.ok) {
        setMessage({ type: "success", text: "Saved as draft" });
        toasts.success("Saved as draft");
        setHasDraft(true);
      } else {
        setMessage({ type: "error", text: "Failed to save draft" });
        toasts.error("Failed to save draft");
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save draft" });
      toasts.error("Failed to save draft");
    }
  }, [getToken, section, data, setMessage, toasts]);

  const publishDraft = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch("/api/admin/config/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        setMessage({ type: "success", text: "Draft published successfully" });
        toasts.success("Draft published successfully");
        setHasDraft(false);
        setDraftInfo(null);
      } else {
        setMessage({ type: "error", text: "Failed to publish draft" });
        toasts.error("Failed to publish draft");
      }
    } catch {
      setMessage({ type: "error", text: "Failed to publish draft" });
      toasts.error("Failed to publish draft");
    }
  }, [getToken, setMessage, toasts]);

  const discardDraft = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch("/api/admin/config/draft", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setMessage({ type: "success", text: "Draft discarded" });
        toasts.info("Draft discarded");
        setHasDraft(false);
        setDraftInfo(null);
      } else {
        setMessage({ type: "error", text: "Failed to discard draft" });
        toasts.error("Failed to discard draft");
      }
    } catch {
      setMessage({ type: "error", text: "Failed to discard draft" });
      toasts.error("Failed to discard draft");
    }
  }, [getToken, setMessage, toasts]);

  const reset = useCallback(
    (defaults: T) => {
      setData(defaults);
      setMessage({ type: "success", text: "Reset to defaults (save to apply)" });
      toasts.info("Reset to defaults (save to apply)");
    },
    [setMessage, toasts]
  );

  return {
    data, setData, loading, saving, message, clearMessage,
    save, saveAsDraft, reset,
    hasDraft, draftInfo, publishDraft, discardDraft,
  };
}

// ── Version history hook ─────────────────────────────────────────────

export interface ConfigVersionEntry {
  id: string;
  version: number;
  status: string;
  section: string;
  authorName: string;
  comment: string | null;
  createdAt: string;
  publishedAt: string | null;
}

export function useConfigVersions(page: number) {
  return useAdminFetch<{
    versions: ConfigVersionEntry[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }>("/api/admin/config/versions", {
    params: { page: String(page) },
  });
}

// ── Rollback hook ────────────────────────────────────────────────────

export function useRollback() {
  const { getToken } = useAdminToken();
  const [rolling, setRolling] = useState(false);

  const rollback = useCallback(
    async (versionId: string): Promise<{ success: boolean; error?: string }> => {
      setRolling(true);
      try {
        const token = await getToken();
        const response = await fetch(`/api/admin/config/versions/${versionId}/rollback`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          return { success: true };
        }
        const data = await response.json().catch(() => ({}));
        return { success: false, error: data.error || "Rollback failed" };
      } catch {
        return { success: false, error: "Rollback failed" };
      } finally {
        setRolling(false);
      }
    },
    [getToken]
  );

  return { rollback, rolling };
}
