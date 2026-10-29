const PAGE_SCRIPT = "<script>";
const TITLE_TOKEN = "__LINEUP_TITLE__";

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/** JSON that is safe to put inside a <script> element. */
export function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(new RegExp(String.fromCharCode(0x2028), "g"), "\\u2028")
    .replace(new RegExp(String.fromCharCode(0x2029), "g"), "\\u2029");
}

export interface PageParts {
  title: string;
  /** What window.__LINEUP__ becomes: { config, strings }. */
  client: unknown;
  themeCss: string;
  shim: string;
}

/**
 * Puts the config, the theme and the shim in front of the page script. Returns null when
 * the HTML has no script to anchor on.
 */
export function buildLineupPage(html: string, parts: PageParts): string | null {
  const at = html.indexOf(PAGE_SCRIPT);
  if (at === -1) return null;
  const head = html.slice(0, at).replace(TITLE_TOKEN, escapeHtml(parts.title));
  const theme = parts.themeCss ? `<style>${parts.themeCss}</style>\n` : "";
  const shim = parts.shim ? `<script>${parts.shim}</script>\n` : "";
  return `${head}${theme}<script>window.__LINEUP__=${safeJson(parts.client)};</script>\n${shim}${html.slice(at)}`;
}
