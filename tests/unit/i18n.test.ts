import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { dictionary, format, t } from "../../lib/i18n";

const ROOT = process.cwd();
const page = readFileSync(path.join(ROOT, "lib/lineup/lineup.html"), "utf8");

/** The Spanish keys the page asks for: tr("..."), plus tr(cond?"a":"b"). */
function pageKeys(): string[] {
  const keys = new Set<string>();
  for (const match of page.matchAll(/(?<![\w$.])tr\(\s*("(?:[^"\\]|\\.)*")/g)) keys.add(JSON.parse(match[1]));
  for (const match of page.matchAll(/tr\([^"()]*\?("(?:[^"\\]|\\.)*"):("(?:[^"\\]|\\.)*")/g)) {
    keys.add(JSON.parse(match[1]));
    keys.add(JSON.parse(match[2]));
  }
  return [...keys];
}

/** The keys the server code asks for: t(lang, "..."). */
function serverKeys(): string[] {
  const keys = new Set<string>();
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const file = path.join(dir, name);
      if (statSync(file).isDirectory()) walk(file);
      else if (/\.(ts|tsx)$/.test(name)) {
        const text = readFileSync(file, "utf8");
        for (const match of text.matchAll(/\bt\((?:lang|config\.lang),\s*("(?:[^"\\]|\\.)*")/g)) keys.add(JSON.parse(match[1]));
      }
    }
  };
  walk(path.join(ROOT, "app"));
  return [...keys];
}

describe("translations", () => {
  const en = dictionary("en");

  test("the page really uses translation keys", () => {
    assert.ok(pageKeys().length > 150);
  });

  test("every key the page uses has an English translation", () => {
    const missing = pageKeys().filter((key) => !(key in en));
    assert.deepEqual(missing, []);
  });

  test("every key the server pages use has an English translation", () => {
    const keys = serverKeys();
    assert.ok(keys.length > 5);
    assert.deepEqual(keys.filter((key) => !(key in en)), []);
  });

  test("a translation keeps the same {placeholders} as its key", () => {
    const names = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const [key, value] of Object.entries(en)) assert.deepEqual(names(value), names(key), key);
  });

  test("no translation uses an en dash or an em dash", () => {
    const dashes = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
    for (const value of Object.values(en)) assert.ok(!dashes.test(value), value);
  });
});

describe("t and format", () => {
  test("Spanish returns the key and English its translation", () => {
    assert.equal(t("es", "Guardando"), "Guardando");
    assert.equal(t("en", "Guardando"), "Saving");
  });

  test("an unknown key falls back to itself", () => {
    assert.equal(t("en", "no existe"), "no existe");
  });

  test("fills {placeholders} and leaves unknown ones alone", () => {
    assert.equal(format("Hola {name}, {x}", { name: "Ada" }), "Hola Ada, {x}");
    assert.equal(t("en", "Metas de la semana {n}", { n: 43 }), "Goals for week 43");
  });
});
