"use client";

import { useState, useEffect, useCallback } from "react";
import { useMsal } from "@azure/msal-react";
import { graphScopes } from "@/lib/msal-config";
import { ReviewPolicyEditor } from "@/components/admin/review-policy-editor";
import { DEFAULT_REVIEW_POLICIES, type ReviewPolicy } from "@/lib/taxonomy-defaults";
import { Loader2, Save, RotateCcw } from "lucide-react";

export default function ReviewPoliciesPage() {
  const { instance } = useMsal();
  const [policies, setPolicies] = useState<ReviewPolicy[]>(DEFAULT_REVIEW_POLICIES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const getToken = useCallback(async () => {
    const account = instance.getActiveAccount() ?? instance.getAllAccounts()[0];
    if (!account) throw new Error("No account");
    const response = await instance.acquireTokenSilent({
      scopes: graphScopes.admin,
      account,
    });
    return response.accessToken;
  }, [instance]);

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const response = await fetch("/api/admin/config", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.reviewPolicies)) {
            setPolicies(data.reviewPolicies);
          }
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getToken]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const token = await getToken();
      const response = await fetch("/api/admin/review-policies", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reviewPolicies: policies }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Review policies saved successfully" });
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error || "Failed to save" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save review policies" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPolicies([...DEFAULT_REVIEW_POLICIES]);
    setMessage({ type: "success", text: "Reset to defaults (save to apply)" });
  };

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
          <p className="text-xs text-[#667781] mt-0.5">
            Define staleness thresholds per content type. Documents exceeding these limits
            will display warnings to users.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#d0d8e0] rounded-md text-[#667781] hover:text-[#1a2a3a] hover:border-[#1a2a3a] transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#1976d2] text-white rounded-md hover:bg-[#1565c0] disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Changes
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`text-sm px-4 py-2 rounded-md ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="bg-white rounded-lg border border-[#d0d8e0] p-4">
        <h3 className="text-sm font-medium text-[#1a2a3a] mb-1">Staleness Rules</h3>
        <p className="text-xs text-[#667781] mb-3">
          <strong>Max Age:</strong> Documents not updated within this period are flagged as stale.
          <br />
          <strong>Warn Before:</strong> Warning shown this many days before the document hits the stale threshold.
        </p>
        <ReviewPolicyEditor policies={policies} onChange={setPolicies} />
      </section>
    </div>
  );
}
