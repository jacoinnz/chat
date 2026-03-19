"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMsal } from "@azure/msal-react";
import { useTokenAcquisition } from "@/hooks/use-token";
import { graphScopes } from "@/lib/msal-config";
import {
  Loader2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Search,
  Settings,
  Shield,
  PartyPopper,
} from "lucide-react";

const STEPS = [
  { label: "Admin Consent", icon: Shield },
  { label: "Schema Discovery", icon: Search },
  { label: "Property Mapping", icon: Settings },
  { label: "Complete", icon: PartyPopper },
] as const;

interface DiscoveredProperty {
  id: string;
  name: string;
  type: string;
  refinable: boolean;
  queryable: boolean;
  retrievable: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { instance } = useMsal();
  const { getToken } = useTokenAcquisition(graphScopes.admin);

  // Auto-advance to step 2 when returning from Azure AD admin consent
  const adminConsent = searchParams.get("admin_consent");
  const initialStep = adminConsent === "True" ? 2 : 1;
  const [step, setStep] = useState(initialStep);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8">
      {/* Header */}
      <div className="w-full max-w-2xl mb-8 text-center">
        <h1 className="text-2xl font-bold text-[#0d3b66]">Setup Wizard</h1>
        <p className="text-sm text-[#667781] mt-1">
          Configure your tenant in a few quick steps
        </p>
      </div>

      {/* Step Indicator */}
      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const stepNum = i + 1;
            const isActive = step === stepNum;
            const isCompleted = step > stepNum;
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex-1 flex flex-col items-center">
                <div className="flex items-center w-full">
                  {i > 0 && (
                    <div
                      className={`flex-1 h-0.5 ${
                        step > i ? "bg-green-500" : "bg-[#d0d8e0]"
                      }`}
                    />
                  )}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isCompleted
                        ? "bg-green-500 text-white"
                        : isActive
                          ? "bg-[#1976d2] text-white"
                          : "bg-[#d0d8e0] text-[#667781]"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 ${
                        step > stepNum ? "bg-green-500" : "bg-[#d0d8e0]"
                      }`}
                    />
                  )}
                </div>
                <span
                  className={`text-xs mt-2 ${
                    isActive
                      ? "text-[#1976d2] font-semibold"
                      : isCompleted
                        ? "text-green-600 font-medium"
                        : "text-[#667781]"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="w-full max-w-2xl">
        {step === 1 && (
          <Step1AdminConsent
            instance={instance}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <Step2SchemaDiscovery
            getToken={getToken}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <Step3PropertyMapping
            getToken={getToken}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <Step4Complete onGoToAdmin={() => router.push("/admin")} />
        )}
      </div>
    </div>
  );
}

// ── Step 1: Admin Consent ─────────────────────────────────────────────

function Step1AdminConsent({
  instance,
  onNext,
}: {
  instance: ReturnType<typeof useMsal>["instance"];
  onNext: () => void;
}) {
  const account = instance.getActiveAccount() ?? instance.getAllAccounts()[0];
  const tenantId = account?.tenantId;
  const clientId = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID;

  const handleConsent = () => {
    const redirectUri = `${window.location.origin}/onboarding`;
    window.location.href =
      `https://login.microsoftonline.com/${tenantId}/adminconsent` +
      `?client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <h2 className="text-xl font-semibold text-[#1a2a3a] mb-3">
        Welcome to SharePoint Chatbot
      </h2>
      <p className="text-sm text-[#667781] mb-6 leading-relaxed">
        Before we begin, your organisation needs to grant admin consent for this
        application to access SharePoint data on behalf of your users. This is a
        one-time step that allows the chatbot to search documents across your
        tenant.
      </p>

      <div className="flex items-center gap-4">
        <button
          onClick={handleConsent}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1976d2] text-white rounded-md text-sm font-medium hover:bg-[#1565c0] transition-colors"
        >
          <Shield className="h-4 w-4" />
          Grant Admin Consent
        </button>
        <button
          onClick={onNext}
          className="text-sm text-[#667781] hover:text-[#1976d2] transition-colors underline"
        >
          Skip (already consented)
        </button>
      </div>

      {tenantId && (
        <p className="text-xs text-[#667781] mt-4">
          Tenant: <span className="font-mono">{tenantId}</span>
        </p>
      )}
    </div>
  );
}

// ── Step 2: Schema Discovery ──────────────────────────────────────────

function Step2SchemaDiscovery({
  getToken,
  onNext,
  onBack,
}: {
  getToken: () => Promise<string>;
  onNext: () => void;
  onBack: () => void;
}) {
  const [status, setStatus] = useState<
    "idle" | "scraping" | "success" | "error"
  >("idle");
  const [propertyCount, setPropertyCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const handleDiscover = async () => {
    setStatus("scraping");
    setErrorMsg("");
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/search-schema", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed (${res.status})`);
      }

      const data = await res.json();
      setPropertyCount(data.count || 0);
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Discovery failed");
      setStatus("error");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <h2 className="text-xl font-semibold text-[#1a2a3a] mb-3">
        Schema Discovery
      </h2>
      <p className="text-sm text-[#667781] mb-6 leading-relaxed">
        Discover your tenant&apos;s SharePoint search schema to find available
        managed properties. This helps configure accurate search filters and
        property mappings.
      </p>

      {status === "idle" && (
        <button
          onClick={handleDiscover}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1976d2] text-white rounded-md text-sm font-medium hover:bg-[#1565c0] transition-colors"
        >
          <Search className="h-4 w-4" />
          Discover Schema
        </button>
      )}

      {status === "scraping" && (
        <div className="flex items-center gap-3 text-[#1976d2]">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Scanning SharePoint schema...</span>
        </div>
      )}

      {status === "success" && (
        <div className="flex items-center gap-3 text-green-600 mb-4">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-medium">
            Found {propertyCount} managed properties
          </span>
        </div>
      )}

      {status === "error" && (
        <div className="mb-4">
          <p className="text-sm text-red-600 mb-2">{errorMsg}</p>
          <button
            onClick={handleDiscover}
            className="text-sm text-[#1976d2] hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#d0d8e0]">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-[#667781] hover:text-[#1976d2] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex items-center gap-4">
          <button
            onClick={onNext}
            className="text-sm text-[#667781] hover:text-[#1976d2] transition-colors underline"
          >
            Skip
          </button>
          {status === "success" && (
            <button
              onClick={onNext}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1976d2] text-white rounded-md text-sm font-medium hover:bg-[#1565c0] transition-colors"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Property Mapping ──────────────────────────────────────────

const DEFAULT_REFINABLE_PROPS = [
  "ContentType",
  "Department",
  "Status",
  "Sensitivity",
];

function Step3PropertyMapping({
  getToken,
  onNext,
  onBack,
}: {
  getToken: () => Promise<string>;
  onNext: () => void;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [properties, setProperties] = useState<DiscoveredProperty[]>([]);
  const [selectedProps, setSelectedProps] = useState<Set<string>>(new Set());
  const [customMappings, setCustomMappings] = useState<
    { key: string; value: string }[]
  >([]);

  const loadProperties = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/search-schema", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const props: DiscoveredProperty[] = data.properties || [];
        setProperties(props);

        // Pre-select default refinable properties if found
        const refinable = props.filter((p) => p.refinable);
        const preSelected = new Set<string>();
        for (const prop of refinable) {
          if (
            DEFAULT_REFINABLE_PROPS.some(
              (d) => d.toLowerCase() === prop.name.toLowerCase()
            )
          ) {
            preSelected.add(prop.name);
          }
        }
        setSelectedProps(preSelected);
      }
    } catch {
      // Properties not available — proceed with defaults
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const toggleProp = (name: string) => {
    setSelectedProps((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const addCustomMapping = () => {
    setCustomMappings((prev) => [...prev, { key: "", value: "" }]);
  };

  const updateCustomMapping = (
    index: number,
    field: "key" | "value",
    val: string
  ) => {
    setCustomMappings((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: val } : m))
    );
  };

  const removeCustomMapping = (index: number) => {
    setCustomMappings((prev) => prev.filter((_, i) => i !== index));
  };

  const handleComplete = async () => {
    setSaving(true);
    setError("");
    try {
      const token = await getToken();

      // Build KQL property map from selected properties + custom mappings
      const kqlPropertyMap: Record<string, string> = {};
      for (const name of selectedProps) {
        kqlPropertyMap[name.charAt(0).toLowerCase() + name.slice(1)] = name;
      }
      for (const m of customMappings) {
        if (m.key.trim() && m.value.trim()) {
          kqlPropertyMap[m.key.trim()] = m.value.trim();
        }
      }

      // Search fields = selected property names
      const searchFields = [...selectedProps];

      const res = await fetch("/api/admin/config/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ kqlPropertyMap, searchFields }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) {
          // Config already exists — treat as success
          onNext();
          return;
        }
        throw new Error(data.error || `Failed (${res.status})`);
      }

      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setSaving(false);
    }
  };

  const refinableProps = properties.filter((p) => p.refinable);

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <h2 className="text-xl font-semibold text-[#1a2a3a] mb-3">
        Property Mapping
      </h2>
      <p className="text-sm text-[#667781] mb-6 leading-relaxed">
        Select which refinable properties to use for search filters. You can
        also add custom key-value mappings.
      </p>

      {loading ? (
        <div className="flex items-center gap-3 text-[#1976d2] py-4">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading discovered properties...</span>
        </div>
      ) : (
        <>
          {/* Refinable Properties */}
          {refinableProps.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-[#1a2a3a] mb-3">
                Refinable Properties ({refinableProps.length})
              </h3>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-[#d0d8e0] rounded-md p-3">
                {refinableProps.map((prop) => (
                  <label
                    key={prop.id}
                    className="flex items-center gap-2 text-sm text-[#1a2a3a] cursor-pointer hover:bg-[#e8eef4] rounded px-2 py-1"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProps.has(prop.name)}
                      onChange={() => toggleProp(prop.name)}
                      className="rounded border-[#d0d8e0] text-[#1976d2] focus:ring-[#1976d2]"
                    />
                    <span>{prop.name}</span>
                    <span className="text-xs text-[#667781]">({prop.type})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {refinableProps.length === 0 && (
            <p className="text-sm text-[#667781] mb-6 italic">
              No discovered properties found. Default properties will be used.
              You can run schema discovery later from the admin portal.
            </p>
          )}

          {/* Custom Mappings */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#1a2a3a]">
                Custom Mappings
              </h3>
              <button
                onClick={addCustomMapping}
                className="text-xs text-[#1976d2] hover:underline"
              >
                + Add mapping
              </button>
            </div>
            {customMappings.length === 0 && (
              <p className="text-xs text-[#667781] italic">
                No custom mappings. Click &quot;+ Add mapping&quot; to add one.
              </p>
            )}
            {customMappings.map((m, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Key (e.g. project)"
                  value={m.key}
                  onChange={(e) => updateCustomMapping(i, "key", e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-[#d0d8e0] rounded text-sm text-[#1a2a3a] focus:outline-none focus:ring-1 focus:ring-[#1976d2]"
                />
                <ArrowRight className="h-4 w-4 text-[#667781] shrink-0" />
                <input
                  type="text"
                  placeholder="Managed Property"
                  value={m.value}
                  onChange={(e) =>
                    updateCustomMapping(i, "value", e.target.value)
                  }
                  className="flex-1 px-3 py-1.5 border border-[#d0d8e0] rounded text-sm text-[#1a2a3a] focus:outline-none focus:ring-1 focus:ring-[#1976d2]"
                />
                <button
                  onClick={() => removeCustomMapping(i)}
                  className="text-sm text-red-500 hover:text-red-700 shrink-0 px-1"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="flex items-center justify-between pt-4 border-t border-[#d0d8e0]">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-[#667781] hover:text-[#1976d2] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={handleComplete}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1976d2] text-white rounded-md text-sm font-medium hover:bg-[#1565c0] transition-colors disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Complete Setup
              <CheckCircle2 className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Step 4: Completion ────────────────────────────────────────────────

function Step4Complete({ onGoToAdmin }: { onGoToAdmin: () => void }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-8 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="h-8 w-8 text-green-600" />
      </div>
      <h2 className="text-xl font-semibold text-[#1a2a3a] mb-2">
        Setup Complete
      </h2>
      <p className="text-sm text-[#667781] mb-6 leading-relaxed">
        Your tenant configuration has been created with sensible defaults. You
        can fine-tune all settings from the admin portal.
      </p>
      <button
        onClick={onGoToAdmin}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1976d2] text-white rounded-md text-sm font-medium hover:bg-[#1565c0] transition-colors"
      >
        Go to Admin Portal
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
