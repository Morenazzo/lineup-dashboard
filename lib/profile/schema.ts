/**
 * profile.json is the content of the public card at "/". It is plain data that anyone can
 * edit, so it is checked here before it is shown: unknown fields are dropped, text is
 * trimmed and capped, and a link must be http, https or mailto (a file or avatar may
 * also be a path under /public).
 */
export interface ProfileLink {
  label: string;
  url: string;
}

export interface ResumeItem {
  title: string;
  org: string;
  period: string;
  note: string;
  url: string;
}

export interface Profile {
  name: string;
  headline: string;
  concept: string;
  location: string;
  avatar: string;
  links: ProfileLink[];
  resume: {
    summary: string;
    downloadUrl: string;
    items: ResumeItem[];
  };
}

const MAX_TEXT = 600;
const MAX_LINKS = 12;
const MAX_ITEMS = 20;

function text(value: unknown, max = MAX_TEXT): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** An absolute http, https or mailto URL, or a path under /public. Anything else becomes "". */
export function safeUrl(value: unknown): string {
  const raw = text(value, 500);
  if (!raw) return "";
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  try {
    const url = new URL(raw);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function list(value: unknown, max: number): unknown[] {
  return Array.isArray(value) ? value.slice(0, max) : [];
}

export function parseProfile(raw: unknown): Profile {
  const input = record(raw);
  const resume = record(input.resume);

  const links = list(input.links, MAX_LINKS)
    .map((item) => {
      const link = record(item);
      return { label: text(link.label, 60), url: safeUrl(link.url) };
    })
    .filter((link) => link.label && link.url);

  const items = list(resume.items, MAX_ITEMS)
    .map((item) => {
      const entry = record(item);
      return {
        title: text(entry.title, 120),
        org: text(entry.org, 120),
        period: text(entry.period, 60),
        note: text(entry.note),
        url: safeUrl(entry.url),
      };
    })
    .filter((entry) => entry.title);

  return {
    name: text(input.name, 120),
    headline: text(input.headline, 160),
    concept: text(input.concept),
    location: text(input.location, 120),
    avatar: safeUrl(input.avatar),
    links,
    resume: {
      summary: text(resume.summary, 1200),
      downloadUrl: safeUrl(resume.downloadUrl),
      items,
    },
  };
}
