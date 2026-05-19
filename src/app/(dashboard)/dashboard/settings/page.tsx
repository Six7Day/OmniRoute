import { redirect } from "next/navigation";

const LEGACY_TAB_ROUTES: Record<string, string> = {
  advanced: "advanced",
  ai: "ai",
  appearance: "appearance",
  general: "general",
  pricing: "pricing",
  resilience: "resilience",
  routing: "routing",
  security: "security",
};

type SettingsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = searchParams ? await searchParams : {};
  const tab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const route = typeof tab === "string" ? LEGACY_TAB_ROUTES[tab] : null;

  redirect(`/dashboard/settings/${route || "general"}`);
}
