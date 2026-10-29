import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseProfile, safeUrl } from "../../lib/profile/schema";
import sample from "../../profile.json";

describe("parseProfile", () => {
  test("the shipped profile.json parses with a name, links and a resume", () => {
    const profile = parseProfile(sample);
    assert.ok(profile.name);
    assert.ok(profile.links.length > 0);
    assert.ok(profile.resume.items.length > 0);
  });

  test("garbage in gives an empty profile, not an error", () => {
    for (const input of [null, undefined, 42, "x", [], {}]) {
      const profile = parseProfile(input);
      assert.equal(profile.name, "");
      assert.deepEqual(profile.links, []);
      assert.deepEqual(profile.resume.items, []);
    }
  });

  test("drops links with unsafe or missing urls and entries without a title", () => {
    const profile = parseProfile({
      links: [
        { label: "ok", url: "https://example.com" },
        { label: "mail", url: "mailto:hola@example.com" },
        { label: "bad", url: "javascript:alert(1)" },
        { label: "", url: "https://example.com" },
        { label: "data", url: "data:text/html,x" },
      ],
      resume: { items: [{ title: "", org: "x" }, { title: "Real" }] },
    });
    assert.deepEqual(profile.links.map((link) => link.label), ["ok", "mail"]);
    assert.deepEqual(profile.resume.items.map((item) => item.title), ["Real"]);
  });

  test("trims and caps text and ignores fields of the wrong type", () => {
    const profile = parseProfile({ name: "  Ada  ", concept: "x".repeat(5000), headline: 7 });
    assert.equal(profile.name, "Ada");
    assert.equal(profile.concept.length, 600);
    assert.equal(profile.headline, "");
  });
});

describe("safeUrl", () => {
  test("allows http, https, mailto and paths under /public only", () => {
    assert.equal(safeUrl("/cv.pdf"), "/cv.pdf");
    assert.equal(safeUrl("https://example.com/a"), "https://example.com/a");
    assert.equal(safeUrl("//evil.example.com"), "");
    assert.equal(safeUrl("javascript:alert(1)"), "");
    assert.equal(safeUrl("not a url"), "");
    assert.equal(safeUrl(undefined), "");
  });
});
