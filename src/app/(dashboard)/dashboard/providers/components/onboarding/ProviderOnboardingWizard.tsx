"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Badge,
  Button,
  Card,
  CursorAuthModal,
  Input,
  KiroOAuthWrapper,
  OAuthModal,
} from "@/shared/components";

import {
  buildProviderSpecificData,
  filterWizardProviderOptions,
  getDefaultConnectionName,
  getWizardApiKeyProviderOptions,
  getWizardOAuthProviderOptions,
  type WizardProviderOption,
} from "./providerOnboardingCatalog";
import {
  createCompatibleProviderNode,
  createOnboardingConnection,
  fetchOnboardingConnections,
  testOnboardingConnection,
  validateOnboardingApiKey,
  type CompatibleNodeMode,
  type OnboardingConnection,
  type OnboardingTestResult,
} from "./providerOnboardingApi";

type WizardKind = "apikey" | "custom" | "oauth";
type WizardStep = "type" | "provider" | "credentials" | "oauth" | "result";

type ApiKeyFormState = {
  name: string;
  apiKey: string;
  baseUrl: string;
  region: string;
  cx: string;
  customUserAgent: string;
};

type CustomFormState = {
  mode: CompatibleNodeMode;
  name: string;
  prefix: string;
  baseUrl: string;
  apiKey: string;
  chatPath: string;
  modelsPath: string;
};

const EMPTY_API_KEY_FORM: ApiKeyFormState = {
  name: "",
  apiKey: "",
  baseUrl: "",
  region: "",
  cx: "",
  customUserAgent: "",
};

const DEFAULT_CUSTOM_FORM: CustomFormState = {
  mode: "openai",
  name: "",
  prefix: "",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  chatPath: "",
  modelsPath: "",
};

function StepPill({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
        active
          ? "border-primary/50 bg-primary/10 text-primary"
          : done
            ? "border-success/30 bg-success/10 text-success"
            : "border-border bg-bg-subtle text-text-muted"
      }`}
    >
      <span className="material-symbols-outlined text-[16px]">
        {done ? "check" : active ? "radio_button_checked" : "radio_button_unchecked"}
      </span>
      {label}
    </div>
  );
}

function ProviderOptionCard({
  option,
  selected,
  onSelect,
}: {
  option: WizardProviderOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex h-full flex-col gap-3 rounded-xl border p-4 text-left transition-colors ${
        selected
          ? "border-primary/60 bg-primary/10"
          : "border-border bg-bg-card hover:border-primary/40 hover:bg-bg-subtle"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex size-10 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: option.color || "#6366f1" }}
          >
            <span className="material-symbols-outlined text-[22px]">{option.icon}</span>
          </div>
          <div>
            <div className="font-semibold text-text-main">{option.name}</div>
            <div className="text-xs text-text-muted">{option.id}</div>
          </div>
        </div>
        {option.deprecated && <Badge variant="warning">Deprecated</Badge>}
      </div>
      <p className="line-clamp-3 text-sm text-text-muted">{option.description}</p>
      {option.apiKeyOptional && option.authKind === "apikey" && (
        <span className="text-xs font-medium text-success">API key optional</span>
      )}
    </button>
  );
}

function ResultSummary({
  connection,
  testResult,
  error,
}: {
  connection: OnboardingConnection | null;
  testResult: OnboardingTestResult | null;
  error: string | null;
}) {
  const valid = testResult?.valid === true;
  const failed = Boolean(error || testResult?.valid === false);

  return (
    <Card padding="lg">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex size-12 items-center justify-center rounded-full ${
              valid
                ? "bg-success/10 text-success"
                : failed
                  ? "bg-error/10 text-error"
                  : "bg-primary/10 text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-[28px]">
              {valid ? "check_circle" : failed ? "error" : "dns"}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-text-main">
              {valid
                ? "Provider connected"
                : failed
                  ? "Provider saved with warnings"
                  : "Provider onboarding finished"}
            </h2>
            <p className="text-sm text-text-muted">
              {connection?.name || connection?.provider || "Your provider connection"}
            </p>
          </div>
        </div>

        {testResult && (
          <div className="rounded-lg border border-border bg-bg-subtle p-3 text-sm text-text-muted">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={valid ? "success" : "error"}>
                {valid ? "Test passed" : "Test failed"}
              </Badge>
              {typeof testResult.latencyMs === "number" && <span>{testResult.latencyMs} ms</span>}
              {typeof testResult.statusCode === "number" && (
                <span>HTTP {testResult.statusCode}</span>
              )}
            </div>
            {(testResult.error || testResult.warning || testResult.diagnosis?.message) && (
              <p className="mt-2">
                {testResult.error || testResult.warning || testResult.diagnosis?.message}
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {connection?.provider && (
            <Link
              href={`/dashboard/providers/${connection.provider}`}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              Open provider details
            </Link>
          )}
          <Link
            href="/dashboard/providers"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-bg-subtle px-4 py-2 text-sm font-medium text-text-main transition-colors hover:bg-bg-card"
          >
            Back to providers
          </Link>
          <Link
            href="/dashboard/playground"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-main"
          >
            Try in playground
          </Link>
        </div>
      </div>
    </Card>
  );
}

export default function ProviderOnboardingWizard() {
  const router = useRouter();
  const apiKeyOptions = useMemo(() => getWizardApiKeyProviderOptions(), []);
  const oauthOptions = useMemo(() => getWizardOAuthProviderOptions(), []);
  const [kind, setKind] = useState<WizardKind>("apikey");
  const [step, setStep] = useState<WizardStep>("type");
  const [query, setQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<WizardProviderOption | null>(null);
  const [apiKeyForm, setApiKeyForm] = useState<ApiKeyFormState>(EMPTY_API_KEY_FORM);
  const [customForm, setCustomForm] = useState<CustomFormState>(DEFAULT_CUSTOM_FORM);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [createdConnection, setCreatedConnection] = useState<OnboardingConnection | null>(null);
  const [testResult, setTestResult] = useState<OnboardingTestResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const [knownOAuthConnectionIds, setKnownOAuthConnectionIds] = useState<Set<string>>(new Set());
  const [ccCompatibleProviderEnabled, setCcCompatibleProviderEnabled] = useState(false);

  const providerOptions = kind === "oauth" ? oauthOptions : apiKeyOptions;
  const filteredOptions = filterWizardProviderOptions(providerOptions, query);
  const currentStepIndex = ["type", "provider", "credentials", "oauth", "result"].indexOf(step);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/provider-nodes")
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { ccCompatibleProviderEnabled?: boolean };
      })
      .then((data) => {
        if (!cancelled) {
          setCcCompatibleProviderEnabled(data?.ccCompatibleProviderEnabled === true);
        }
      })
      .catch(() => {
        if (!cancelled) setCcCompatibleProviderEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ccCompatibleProviderEnabled && customForm.mode === "cc") {
      setCustomForm({ ...customForm, mode: "openai", baseUrl: "https://api.openai.com/v1" });
    }
  }, [ccCompatibleProviderEnabled, customForm]);

  const resetProviderSelection = (nextKind: WizardKind) => {
    setKind(nextKind);
    setSelectedProvider(null);
    setQuery("");
    setError(null);
    setTestResult(null);
    setCreatedConnection(null);
    setApiKeyForm(EMPTY_API_KEY_FORM);
    setCustomForm(DEFAULT_CUSTOM_FORM);
    setStep(nextKind === "custom" ? "credentials" : "provider");
  };

  const selectProvider = (option: WizardProviderOption) => {
    setSelectedProvider(option);
    setApiKeyForm({ ...EMPTY_API_KEY_FORM, name: getDefaultConnectionName(option) });
    setError(null);
    setStep(option.authKind === "oauth" ? "oauth" : "credentials");
  };

  const runConnectionTest = async (connection: OnboardingConnection) => {
    setStatus("Testing provider connection…");
    const result = await testOnboardingConnection(connection.id);
    setTestResult(result);
    setStatus("");
    return result;
  };

  const submitApiKeyProvider = async () => {
    if (!selectedProvider) return;
    setSubmitting(true);
    setError(null);
    setTestResult(null);
    try {
      const providerSpecificData = buildProviderSpecificData(apiKeyForm);
      if (apiKeyForm.apiKey.trim()) {
        setStatus("Validating credentials…");
        await validateOnboardingApiKey({
          provider: selectedProvider.id,
          apiKey: apiKeyForm.apiKey.trim() || undefined,
          baseUrl: apiKeyForm.baseUrl.trim() || undefined,
          region: apiKeyForm.region.trim() || undefined,
          cx: apiKeyForm.cx.trim() || undefined,
          customUserAgent: apiKeyForm.customUserAgent.trim() || undefined,
        });
      }
      setStatus("Saving provider connection…");
      const connection = await createOnboardingConnection({
        provider: selectedProvider.id,
        name: apiKeyForm.name.trim() || getDefaultConnectionName(selectedProvider),
        apiKey: apiKeyForm.apiKey.trim() || undefined,
        providerSpecificData,
        testStatus: "unknown",
      });
      setCreatedConnection(connection);
      await runConnectionTest(connection);
      setStep("result");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Provider onboarding failed");
      setStep("result");
    } finally {
      setSubmitting(false);
      setStatus("");
    }
  };

  const submitCustomProvider = async () => {
    setSubmitting(true);
    setError(null);
    setTestResult(null);
    try {
      setStatus("Creating compatible provider…");
      const node = await createCompatibleProviderNode(customForm);
      setStatus("Saving compatible provider connection…");
      const connection = await createOnboardingConnection({
        provider: node.id,
        name: customForm.name.trim() || `${node.name || "Custom provider"} Primary`,
        apiKey: customForm.apiKey.trim() || undefined,
        testStatus: "unknown",
      });
      setCreatedConnection(connection);
      await runConnectionTest(connection);
      setStep("result");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Custom provider onboarding failed"
      );
      setStep("result");
    } finally {
      setSubmitting(false);
      setStatus("");
    }
  };

  const openOAuth = async () => {
    if (!selectedProvider) return;
    setError(null);
    const connections = await fetchOnboardingConnections().catch(() => []);
    setKnownOAuthConnectionIds(new Set(connections.map((connection) => connection.id)));
    setShowOAuthModal(true);
  };

  const handleOAuthSuccess = async () => {
    if (!selectedProvider) return;
    setShowOAuthModal(false);
    setSubmitting(true);
    setError(null);
    try {
      setStatus("Loading OAuth connection…");
      const connections = await fetchOnboardingConnections();
      const matchingConnections = connections.filter(
        (connection) => connection.provider === selectedProvider.id
      );
      const connection =
        matchingConnections.find((candidate) => !knownOAuthConnectionIds.has(candidate.id)) ||
        matchingConnections[0] ||
        null;
      if (!connection) {
        throw new Error("OAuth finished, but no provider connection was found.");
      }
      setCreatedConnection(connection);
      await runConnectionTest(connection);
      setStep("result");
    } catch (oauthError) {
      setError(oauthError instanceof Error ? oauthError.message : "OAuth onboarding failed");
      setStep("result");
    } finally {
      setSubmitting(false);
      setStatus("");
    }
  };

  const customReady = Boolean(
    customForm.name.trim() && customForm.prefix.trim() && customForm.baseUrl.trim()
  );
  const apiKeyReady = Boolean(
    selectedProvider &&
    apiKeyForm.name.trim() &&
    (selectedProvider.apiKeyOptional || apiKeyForm.apiKey.trim())
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href="/dashboard/providers"
            className="text-sm text-text-muted hover:text-text-main"
          >
            ← Back to providers
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-text-main">Provider Onboarding Wizard</h1>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">
            Connect API-key, custom compatible, and OAuth providers with validation, persistence,
            and an immediate connection test.
          </p>
        </div>
        <Button variant="ghost" onClick={() => router.push("/dashboard/providers")}>
          Close
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <StepPill label="Type" active={step === "type"} done={currentStepIndex > 0} />
        <StepPill label="Provider" active={step === "provider"} done={currentStepIndex > 1} />
        <StepPill
          label="Credentials"
          active={step === "credentials" || step === "oauth"}
          done={currentStepIndex > 3}
        />
        <StepPill label="Result" active={step === "result"} done={false} />
      </div>

      {status && (
        <div className="rounded-lg border border-primary/25 bg-primary/10 p-3 text-sm text-primary">
          {status}
        </div>
      )}

      {step === "type" && (
        <Card padding="lg">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                id: "apikey" as const,
                icon: "key",
                title: "API-key provider",
                text: "Use built-in providers such as OpenAI, Anthropic, Gemini, Groq, Azure, and more.",
              },
              {
                id: "custom" as const,
                icon: "hub",
                title: "Custom compatible provider",
                text: "Create an OpenAI-, Anthropic-, or Claude Code-compatible endpoint and add its key.",
              },
              {
                id: "oauth" as const,
                icon: "account_circle",
                title: "OAuth provider",
                text: "Reuse the existing OAuth, device-code, or local import flows for coding providers.",
              },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => resetProviderSelection(item.id)}
                className="rounded-xl border border-border bg-bg-card p-5 text-left transition-colors hover:border-primary/50 hover:bg-bg-subtle"
              >
                <span className="material-symbols-outlined text-[32px] text-primary">
                  {item.icon}
                </span>
                <h2 className="mt-3 text-lg font-semibold text-text-main">{item.title}</h2>
                <p className="mt-2 text-sm text-text-muted">{item.text}</p>
              </button>
            ))}
          </div>
        </Card>
      )}

      {step === "provider" && (
        <Card padding="lg">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-text-main">
                  Choose {kind === "oauth" ? "an OAuth" : "an API-key"} provider
                </h2>
                <p className="text-sm text-text-muted">
                  Select a provider, then the wizard will guide you through credentials and testing.
                </p>
              </div>
              <Button variant="secondary" onClick={() => setStep("type")}>
                Change type
              </Button>
            </div>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search providers…"
              icon="search"
            />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredOptions.map((option) => (
                <ProviderOptionCard
                  key={option.id}
                  option={option}
                  selected={selectedProvider?.id === option.id}
                  onSelect={() => selectProvider(option)}
                />
              ))}
            </div>
          </div>
        </Card>
      )}

      {step === "credentials" && kind === "apikey" && selectedProvider && (
        <Card padding="lg">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-text-main">
                  Add {selectedProvider.name}
                </h2>
                <p className="text-sm text-text-muted">{selectedProvider.description}</p>
              </div>
              <Button variant="secondary" onClick={() => setStep("provider")}>
                Change provider
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Connection name"
                value={apiKeyForm.name}
                onChange={(event) => setApiKeyForm({ ...apiKeyForm, name: event.target.value })}
                placeholder={`${selectedProvider.name} Primary`}
              />
              <Input
                label={selectedProvider.apiKeyOptional ? "API key (optional)" : "API key"}
                type="password"
                value={apiKeyForm.apiKey}
                onChange={(event) => setApiKeyForm({ ...apiKeyForm, apiKey: event.target.value })}
                placeholder="sk-…"
              />
              <Input
                label="Base URL override"
                value={apiKeyForm.baseUrl}
                onChange={(event) => setApiKeyForm({ ...apiKeyForm, baseUrl: event.target.value })}
                placeholder="https://api.example.com/v1"
                hint="Optional. Stored as providerSpecificData.baseUrl."
              />
              <Input
                label="Region"
                value={apiKeyForm.region}
                onChange={(event) => setApiKeyForm({ ...apiKeyForm, region: event.target.value })}
                placeholder="us-east-1"
              />
              <Input
                label="Search CX / Engine id"
                value={apiKeyForm.cx}
                onChange={(event) => setApiKeyForm({ ...apiKeyForm, cx: event.target.value })}
                placeholder="Optional provider-specific id"
              />
              <Input
                label="Custom User-Agent"
                value={apiKeyForm.customUserAgent}
                onChange={(event) =>
                  setApiKeyForm({ ...apiKeyForm, customUserAgent: event.target.value })
                }
                placeholder="Optional"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={submitApiKeyProvider} disabled={!apiKeyReady || submitting}>
                {submitting ? "Working…" : "Validate, save and test"}
              </Button>
              <Button variant="ghost" onClick={() => setStep("provider")}>
                Back
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === "credentials" && kind === "custom" && (
        <Card padding="lg">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-text-main">
                  Create custom compatible provider
                </h2>
                <p className="text-sm text-text-muted">
                  The wizard creates a provider node first, then stores and tests its API-key
                  connection.
                </p>
              </div>
              <Button variant="secondary" onClick={() => setStep("type")}>
                Change type
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-medium text-text-main">
                Protocol
                <select
                  className="rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-main outline-none focus:border-primary"
                  value={customForm.mode}
                  onChange={(event) =>
                    setCustomForm({
                      ...customForm,
                      mode: event.target.value as CompatibleNodeMode,
                      baseUrl:
                        event.target.value === "openai"
                          ? "https://api.openai.com/v1"
                          : event.target.value === "anthropic"
                            ? "https://api.anthropic.com/v1"
                            : "",
                      chatPath: event.target.value === "cc" ? "/v1/messages?beta=true" : "",
                    })
                  }
                >
                  <option value="openai">OpenAI-compatible</option>
                  <option value="anthropic">Anthropic-compatible</option>
                  {ccCompatibleProviderEnabled && (
                    <option value="cc">Claude Code-compatible</option>
                  )}
                </select>
              </label>
              <Input
                label="Display name"
                value={customForm.name}
                onChange={(event) => setCustomForm({ ...customForm, name: event.target.value })}
                placeholder="My Gateway"
              />
              <Input
                label="Provider prefix"
                value={customForm.prefix}
                onChange={(event) => setCustomForm({ ...customForm, prefix: event.target.value })}
                placeholder="my-gateway"
                hint="Used to generate the managed provider id."
              />
              <Input
                label="Base URL"
                value={customForm.baseUrl}
                onChange={(event) => setCustomForm({ ...customForm, baseUrl: event.target.value })}
                placeholder="https://api.example.com/v1"
              />
              <Input
                label="API key"
                type="password"
                value={customForm.apiKey}
                onChange={(event) => setCustomForm({ ...customForm, apiKey: event.target.value })}
                placeholder="sk-…"
              />
              <Input
                label="Chat path"
                value={customForm.chatPath}
                onChange={(event) => setCustomForm({ ...customForm, chatPath: event.target.value })}
                placeholder={customForm.mode === "cc" ? "/v1/messages?beta=true" : "Optional"}
              />
              {customForm.mode !== "cc" && (
                <Input
                  label="Models path"
                  value={customForm.modelsPath}
                  onChange={(event) =>
                    setCustomForm({ ...customForm, modelsPath: event.target.value })
                  }
                  placeholder="Optional"
                />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={submitCustomProvider} disabled={!customReady || submitting}>
                {submitting ? "Working…" : "Create, save and test"}
              </Button>
              <Button variant="ghost" onClick={() => setStep("type")}>
                Back
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === "oauth" && selectedProvider && (
        <Card padding="lg">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-text-main">
                  Connect {selectedProvider.name}
                </h2>
                <p className="text-sm text-text-muted">{selectedProvider.description}</p>
              </div>
              <Button variant="secondary" onClick={() => setStep("provider")}>
                Change provider
              </Button>
            </div>
            <div className="rounded-lg border border-border bg-bg-subtle p-4 text-sm text-text-muted">
              OmniRoute will open the existing OAuth flow for this provider. After login, the wizard
              reloads the saved connection and runs the same connection test as the provider page.
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={openOAuth} disabled={submitting}>
                Start OAuth flow
              </Button>
              <Button variant="ghost" onClick={() => setStep("provider")}>
                Back
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === "result" && (
        <ResultSummary connection={createdConnection} testResult={testResult} error={error} />
      )}

      {selectedProvider &&
        (selectedProvider.id === "kiro" || selectedProvider.id === "amazon-q" ? (
          <KiroOAuthWrapper
            isOpen={showOAuthModal}
            providerInfo={{ id: selectedProvider.id, name: selectedProvider.name }}
            onSuccess={handleOAuthSuccess}
            onClose={() => setShowOAuthModal(false)}
          />
        ) : selectedProvider.id === "cursor" ? (
          <CursorAuthModal
            isOpen={showOAuthModal}
            onSuccess={handleOAuthSuccess}
            onClose={() => setShowOAuthModal(false)}
          />
        ) : (
          <OAuthModal
            isOpen={showOAuthModal}
            provider={selectedProvider.id}
            providerInfo={selectedProvider}
            onSuccess={handleOAuthSuccess}
            onClose={() => setShowOAuthModal(false)}
          />
        ))}
    </div>
  );
}
