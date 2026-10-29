import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { buildLineupPage, safeJson } from "../../lib/lineup/page";
import { LINEUP_SHIM } from "../../lib/lineup/shim";

const html = readFileSync(path.join(process.cwd(), "lib/lineup/lineup.html"), "utf8");

describe("the Lineup page", () => {
  test("its main script is valid JavaScript", () => {
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
    assert.ok(scripts.length >= 1);
    for (const source of scripts) assert.doesNotThrow(() => new Function(source));
  });

  test("it carries no embedded logo and no email address", () => {
    assert.ok(!/data:image/.test(html), "no embedded image");
    assert.ok(!/[\w.-]+@[\w-]+\.\w+/.test(html), "no email address");
  });
});

describe("buildLineupPage", () => {
  const parts = { title: "A & B", client: { config: { name: "</script>" }, strings: {} }, themeCss: ":root{--foam:#fff}", shim: LINEUP_SHIM };

  test("puts the config, theme and shim before the page script, and fills the title", () => {
    const page = buildLineupPage(html, parts);
    assert.ok(page);
    assert.match(page, /<title>A &amp; B<\/title>/);
    assert.ok(!page.includes("__LINEUP_TITLE__"));
    assert.ok(page.indexOf("window.__LINEUP__") < page.indexOf("window.claude = "));
    assert.ok(page.indexOf("window.claude = ") < page.indexOf('"use strict"'));
    assert.match(page, /<style>:root\{--foam:#fff\}<\/style>/);
  });

  test("the config cannot close the script element", () => {
    const page = buildLineupPage(html, parts) ?? "";
    const line = page.split("\n").find((l) => l.includes("window.__LINEUP__")) ?? "";
    assert.equal(line.match(/<\/script>/g)?.length, 1);
  });

  test("with no shim the page is left to run on its own (demo mode)", () => {
    const page = buildLineupPage(html, { ...parts, shim: "" }) ?? "";
    assert.ok(!page.includes("window.claude = "));
    assert.ok(page.includes("window.__LINEUP__"));
  });

  test("returns null when the page has no script to anchor on", () => {
    assert.equal(buildLineupPage("<html></html>", parts), null);
  });
});

describe("safeJson", () => {
  test("escapes characters that end a script element or break a line", () => {
    const text = safeJson({ a: "</script><!--", b: "\u2028" });
    assert.ok(!text.includes("<"));
    assert.deepEqual(JSON.parse(text), { a: "</script><!--", b: "\u2028" });
  });
});
