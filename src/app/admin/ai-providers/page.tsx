"use client";

import { useState, useCallback } from "react";
import { useAdminFetch, useAdminSave, useAdminToken } from "@/hooks/use-admin-api";
import { SectionCard } from "@/components/admin/section-card";
import { SaveBar, MessageBanner } from "@/components/admin/save-bar";
import { Loader2, CheckCircle2, XCircle, Zap } from "lucide-react";

type Provider = "anthropic" | "openai" | "azure_openai";
type KeySource = "platform" | "keyvault";

interface AIProviderFormData {
  provider: Provider;
  modelId: string;
  keySource: KeySource;
  keyVaultUrl: string;
  keyVaultSecret: string;
  azureEndpoint: string;
  azureDeployment: string;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
}

interface AIProviderResponse {
  config: AIProviderFormData;
  hasKey: boolean;
}

const PROVIDERS: { value: Provider; label: string; description: string }[] = [
  { value: "anthropic", label: "Anthropic", description: "Claude models (default)" },
  { value: "openai", label: "OpenAI", description: "GPT models" },
  { value: "azure_openai", label: "Azure OpenAI", description: "Azure-hosted OpenAI models" },
];

export default function AIProvidersPage() {
  const { data: response, loading, refetch } = useAdminFetch<AIProviderResponse>(
    "/api/admin/ai-providers"
  );
  const { save, saving, message, setMessage, clearMessage } = useAdminSave();
  const { getToken } = useAdminToken();

  const [form, setForm] = useState<AIProviderFormData | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  // Initialize form from server data on first load
  const initialized = form !== null;
  if (!initialized && response) {
    // Can't call setState during render in strict mode, use microtask
    queueMicrotask(() => {
      setForm(response.config);
      setHasKey(response.hasKey);
    });
  }

  const updateField = useCallback(
    <K extends keyof AIProviderFormData>(key: K, value: AIProviderFormData[K]) => {
      setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!form) return;
    const payload: Record<string, unknown> = { ...form };
    if (apiKey) {
      payload.apiKey = apiKey;
    }
    // Don't send empty strings for optional URL fields — send undefined
    if (!payload.keyVaultUrl) delete payload.keyVaultUrl;
    if (!payload.azureEndpoint) delete payload.azureEndpoint;

    const ok = await save("/api/admin/ai-providers", payload, "AI provider settings saved");
    if (ok) {
      setApiKey("");
      if (apiKey) setHasKey(true);
      refetch();
    }
  }, [form, apiKey, save, refetch]);

  const handleReset = useCallback(() => {
    setForm({
      provider: "anthropic",
      modelId: "claude-sonnet-4-20250514",
      keySource: "platform",
      keyVaultUrl: "",
      keyVaultSecret: "",
      azureEndpoint: "",
      azureDeployment: "",
      temperature: 0.3,
      maxTokens: 1024,
      enabled: true,
    });
    setApiKey("");
    setMessage({ type: "success", text: "Reset to defaults (save to apply)" });
  }, [setMessage]);

  const handleTestConnection = useCallback(async () => {
    if (!form) return;
    setTesting(true);
    setTestResult(null);

    try {
      const token = await getToken();
      const payload: Record<string, unknown> = { provider: form.provider };

      if (form.keySource === "keyvault") {
        payload.keyVaultUrl = form.keyVaultUrl;
        payload.keyVaultSecret = form.keyVaultSecret;
      } else if (apiKey) {
        payload.apiKey = apiKey;
      }

      if (form.provider === "azure_openai") {
        payload.azureEndpoint = form.azureEndpoint;
        payload.azureDeployment = form.azureDeployment;
      }

      const res = await fetch("/api/admin/ai-providers/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, error: "Connection test failed" });
    } finally {
      setTesting(false);
    }
  }, [form, apiKey, getToken]);

  if (loading || !form) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#1976d2]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#1a2a3a]">AI Provider Settings</h2>
          <p className="text-sm text-[#667781] mt-1">
            Configure the AI model provider and API key for this tenant.
          </p>
        </div>
        <SaveBar
          onSave={handleSave}
          onReset={handleReset}
          saving={saving}
        />
      </div>

      {message && <MessageBanner message={message} />}

      {/* Enabled toggle */}
      <SectionCard title="Status">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#1a2a3a]">Enable tenant-specific AI provider</p>
            <p className="text-xs text-[#667781] mt-0.5">
              When disabled, the platform default API key is used.
            </p>
          </div>
          <button
            type="button"
            onClick={() => updateField("enabled", !form.enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
              form.enabled ? "bg-[#1976d2]" : "bg-[#d0d8e0]"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </SectionCard>

      {/* Provider selection */}
      <SectionCard title="Provider" description="Choose your AI model provider.">
        <div className="space-y-2">
          {PROVIDERS.map((p) => (
            <label
              key={p.value}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                form.provider === p.value
                  ? "border-[#1976d2] bg-blue-50"
                  : "border-[#d0d8e0] hover:bg-[#f8fafb]"
              }`}
            >
              <input
                type="radio"
                name="provider"
                value={p.value}
                checked={form.provider === p.value}
                onChange={() => updateField("provider", p.value)}
                className="accent-[#1976d2]"
              />
              <div>
                <p className="text-sm font-medium text-[#1a2a3a]">{p.label}</p>
                <p className="text-xs text-[#667781]">{p.description}</p>
              </div>
            </label>
          ))}
        </div>
      </SectionCard>

      {/* API Key */}
      <SectionCard title="API Key" description="Configure how the API key is provided.">
        {/* Key source toggle */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => updateField("keySource", "platform")}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              form.keySource === "platform"
                ? "border-[#1976d2] bg-blue-50 text-[#1976d2] font-medium"
                : "border-[#d0d8e0] text-[#667781] hover:bg-[#f8fafb]"
            }`}
          >
            Platform (Encrypted)
          </button>
          <button
            type="button"
            onClick={() => updateField("keySource", "keyvault")}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              form.keySource === "keyvault"
                ? "border-[#1976d2] bg-blue-50 text-[#1976d2] font-medium"
                : "border-[#d0d8e0] text-[#667781] hover:bg-[#f8fafb]"
            }`}
          >
            Azure Key Vault
          </button>
        </div>

        {form.keySource === "platform" ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[#667781] mb-1">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={hasKey ? "Key is set — enter new key to replace" : "Enter API key"}
                className="w-full px-3 py-2 text-sm border border-[#d0d8e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1976d2] focus:border-[#1976d2]"
              />
              {hasKey && !apiKey && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Key is set (encrypted at rest)
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[#667781] mb-1">Key Vault URL</label>
              <input
                type="text"
                value={form.keyVaultUrl}
                onChange={(e) => updateField("keyVaultUrl", e.target.value)}
                placeholder="https://myvault.vault.azure.net"
                className="w-full px-3 py-2 text-sm border border-[#d0d8e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1976d2] focus:border-[#1976d2]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#667781] mb-1">Secret Name</label>
              <input
                type="text"
                value={form.keyVaultSecret}
                onChange={(e) => updateField("keyVaultSecret", e.target.value)}
                placeholder="my-api-key-secret"
                className="w-full px-3 py-2 text-sm border border-[#d0d8e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1976d2] focus:border-[#1976d2]"
              />
            </div>
          </div>
        )}

        {/* Test connection */}
        <div className="mt-4 pt-4 border-t border-[#e8eef4]">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#1976d2] border border-[#1976d2] rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Test Connection
          </button>
          {testResult && (
            <div className={`mt-2 flex items-center gap-1.5 text-sm ${
              testResult.success ? "text-green-600" : "text-red-600"
            }`}>
              {testResult.success ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Connection successful
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  {testResult.error || "Connection failed"}
                </>
              )}
            </div>
          )}
        </div>
      </SectionCard>

      {/* Model Configuration */}
      <SectionCard title="Model Configuration" description="Set the model ID and parameters.">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[#667781] mb-1">Model ID</label>
            <input
              type="text"
              value={form.modelId}
              onChange={(e) => updateField("modelId", e.target.value)}
              placeholder="claude-sonnet-4-20250514"
              className="w-full px-3 py-2 text-sm border border-[#d0d8e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1976d2] focus:border-[#1976d2]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#667781] mb-1">
              Temperature: {form.temperature.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={form.temperature}
              onChange={(e) => updateField("temperature", parseFloat(e.target.value))}
              className="w-full accent-[#1976d2]"
            />
            <div className="flex justify-between text-[10px] text-[#667781]">
              <span>Precise (0)</span>
              <span>Creative (2)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#667781] mb-1">Max Tokens</label>
            <input
              type="number"
              min={100}
              max={8192}
              value={form.maxTokens}
              onChange={(e) => updateField("maxTokens", parseInt(e.target.value) || 1024)}
              className="w-full px-3 py-2 text-sm border border-[#d0d8e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1976d2] focus:border-[#1976d2]"
            />
          </div>
        </div>
      </SectionCard>

      {/* Azure OpenAI Settings */}
      {form.provider === "azure_openai" && (
        <SectionCard
          title="Azure OpenAI Settings"
          description="Required when using Azure-hosted OpenAI models."
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[#667781] mb-1">Azure Endpoint URL</label>
              <input
                type="text"
                value={form.azureEndpoint}
                onChange={(e) => updateField("azureEndpoint", e.target.value)}
                placeholder="https://my-resource.openai.azure.com"
                className="w-full px-3 py-2 text-sm border border-[#d0d8e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1976d2] focus:border-[#1976d2]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#667781] mb-1">Deployment Name</label>
              <input
                type="text"
                value={form.azureDeployment}
                onChange={(e) => updateField("azureDeployment", e.target.value)}
                placeholder="gpt-4o"
                className="w-full px-3 py-2 text-sm border border-[#d0d8e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1976d2] focus:border-[#1976d2]"
              />
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
