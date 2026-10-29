import en from "../locales/en.json";
import type { Lang } from "./config";

/**
 * Strings are written in Spanish in the code and the page, and that Spanish text is the key.
 * Spanish needs no dictionary; every other language is a JSON file in locales/ that maps
 * each Spanish key to its translation. A key that is missing falls back to the Spanish.
 */
const DICTIONARIES: Record<Lang, Record<string, string>> = { es: {}, en };

export function dictionary(lang: Lang): Record<string, string> {
  return DICTIONARIES[lang];
}

export function format(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

export function t(lang: Lang, key: string, params?: Record<string, string | number>): string {
  return format(DICTIONARIES[lang][key] ?? key, params);
}
