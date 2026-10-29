/**
 * The shape of lineup.config.ts. Everything personal to the person who runs a Lineup
 * (their name, goal, language, logo, colors, the sentence that describes what they build)
 * lives there, not in the page or the routes.
 */
export type Lang = "es" | "en";

export interface Milestone {
  /** "first" is the first paying customer. "mrr" and "profit" compare against `value`. */
  type: "first" | "mrr" | "profit";
  value?: number;
  /** Shown on the wave. Optional: a label is built from the type and value. */
  label?: string;
}

export interface CoachModel {
  /** An OpenRouter model id, for example "anthropic/claude-sonnet-5.5". */
  id: string;
  label: string;
}

export interface LineupConfig {
  lang: Lang;
  /** Used to format dates. Defaults to es-MX or en-US from `lang`. */
  locale: string;
  /** The greeting says "Hola, <name>". Leave empty to drop the name. */
  name: string;
  /** Page title and logo alt text. */
  appName: string;
  /** What the AI coach calls your project. */
  projectName: string;
  /** One or two sentences about what you build. The coach reads it. */
  about: string;
  /** Symbol put before amounts. */
  currency: string;
  metric: {
    short: string;
    long: string;
    /** The number the wave climbs toward. */
    goal: number;
  };
  milestones: Milestone[];
  /** A path under /public (for example "/logo.svg") or a full URL. null shows no logo. */
  logo: string | null;
  /** CSS variables to override on :root, for example { "--foam": "#7c3aed" }. */
  theme: Record<string, string>;
  coach: {
    /** The first entry of the select is always the AI_MODEL default; these are the extras. */
    models: CoachModel[];
    /** Extra facts the coach should know (pricing, offer, constraints). Plain text. */
    context: string;
  };
  profile: {
    /** Show the public card at "/". When false, "/" sends visitors to the dashboard. */
    enabled: boolean;
  };
}

export const DEFAULT_CONFIG: LineupConfig = {
  lang: "es",
  locale: "es-MX",
  name: "",
  appName: "Lineup",
  projectName: "mi proyecto",
  about: "",
  currency: "$",
  metric: { short: "MRR", long: "Ingreso recurrente mensual", goal: 10000 },
  milestones: [
    { type: "first" },
    { type: "mrr", value: 1000 },
    { type: "mrr", value: 5000 },
    { type: "mrr", value: 10000 },
  ],
  logo: null,
  theme: {},
  coach: {
    models: [
      { id: "anthropic/claude-opus-5.5", label: "Claude Opus 5.5" },
      { id: "anthropic/claude-haiku-5.5", label: "Claude Haiku 5.5" },
    ],
    context: "",
  },
  profile: { enabled: true },
};

/** Defaults that depend on the language, so an English config carries no Spanish leftovers. */
const LANGUAGE_DEFAULTS: Record<Lang, { projectName: string; metricLong: string }> = {
  es: { projectName: "mi proyecto", metricLong: "Ingreso recurrente mensual" },
  en: { projectName: "my project", metricLong: "Monthly recurring revenue" },
};

export interface LineupConfigInput extends Partial<Omit<LineupConfig, "metric" | "coach" | "profile">> {
  metric?: Partial<LineupConfig["metric"]>;
  coach?: Partial<LineupConfig["coach"]>;
  profile?: Partial<LineupConfig["profile"]>;
}

/** What you export from lineup.config.ts: only the fields you want to change. */
export function defineLineup(input: LineupConfigInput): LineupConfig {
  const lang: Lang = input.lang === "en" ? "en" : "es";
  const merged: LineupConfig = {
    ...DEFAULT_CONFIG,
    ...input,
    lang,
    locale: input.locale ?? (lang === "en" ? "en-US" : "es-MX"),
    projectName: input.projectName ?? LANGUAGE_DEFAULTS[lang].projectName,
    metric: { ...DEFAULT_CONFIG.metric, long: LANGUAGE_DEFAULTS[lang].metricLong, ...input.metric },
    coach: { ...DEFAULT_CONFIG.coach, ...input.coach },
    profile: { ...DEFAULT_CONFIG.profile, ...input.profile },
    theme: input.theme ?? {},
    milestones: input.milestones?.length ? input.milestones : DEFAULT_CONFIG.milestones,
  };
  if (!(merged.metric.goal > 0)) merged.metric.goal = DEFAULT_CONFIG.metric.goal;
  return merged;
}

/** Only these characters may appear in a theme value, so a typo cannot break out of the style tag. */
const SAFE_VALUE = /^[#a-zA-Z0-9(),.%\s/-]+$/;
const SAFE_NAME = /^--[a-z0-9-]+$/;

/** The `:root{...}` rule that applies config.theme. Entries that look unsafe are skipped. */
export function themeCss(theme: Record<string, string>): string {
  const rules = Object.entries(theme)
    .filter(([name, value]) => SAFE_NAME.test(name) && SAFE_VALUE.test(value))
    .map(([name, value]) => `${name}:${value}`);
  return rules.length ? `:root{${rules.join(";")}}` : "";
}

/** The part of the config the browser needs. The coach `available` flag comes from the server's env. */
export function clientConfig(config: LineupConfig, coachAvailable: boolean) {
  return {
    lang: config.lang,
    locale: config.locale,
    name: config.name,
    appName: config.appName,
    projectName: config.projectName,
    about: config.about,
    currency: config.currency,
    metric: config.metric,
    milestones: config.milestones,
    logo: config.logo,
    coach: { models: config.coach.models, context: config.coach.context, available: coachAvailable },
  };
}
