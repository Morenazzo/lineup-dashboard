import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { DEFAULT_CONFIG, clientConfig, defineLineup, themeCss } from "../../lib/config";
import { demoMode } from "../../lib/db/env";
import userConfig from "../../lineup.config";

describe("defineLineup", () => {
  test("fills in everything you leave out", () => {
    const config = defineLineup({ name: "Ada" });
    assert.equal(config.name, "Ada");
    assert.equal(config.lang, "es");
    assert.equal(config.locale, "es-MX");
    assert.equal(config.metric.short, DEFAULT_CONFIG.metric.short);
    assert.ok(config.milestones.length > 0);
  });

  test("English picks the English locale and a partial metric keeps the rest", () => {
    const config = defineLineup({ lang: "en", metric: { goal: 25000 } });
    assert.equal(config.locale, "en-US");
    assert.equal(config.metric.goal, 25000);
    assert.equal(config.metric.long, "Monthly recurring revenue");
    assert.equal(config.projectName, "my project");
  });

  test("what you set wins over the language defaults", () => {
    const config = defineLineup({ lang: "en", projectName: "Acme", metric: { long: "Paying seats" } });
    assert.equal(config.projectName, "Acme");
    assert.equal(config.metric.long, "Paying seats");
  });

  test("an unknown language falls back to Spanish and a bad goal to the default", () => {
    const config = defineLineup({ lang: "fr" as never, metric: { goal: -5 } });
    assert.equal(config.lang, "es");
    assert.equal(config.metric.goal, DEFAULT_CONFIG.metric.goal);
  });

  test("an empty milestone list keeps the default milestones", () => {
    assert.deepEqual(defineLineup({ milestones: [] }).milestones, DEFAULT_CONFIG.milestones);
  });

  test("the shipped lineup.config.ts is a complete config", () => {
    assert.ok(userConfig.metric.goal > 0);
    assert.ok(userConfig.milestones.length > 0);
    assert.ok(["es", "en"].includes(userConfig.lang));
  });
});

describe("themeCss", () => {
  test("builds a :root rule from safe entries", () => {
    assert.equal(themeCss({ "--foam": "#7c3aed", "--ink": "rgb(1, 2, 3)" }), ":root{--foam:#7c3aed;--ink:rgb(1, 2, 3)}");
  });

  test("skips names that are not CSS variables and values that could break out", () => {
    assert.equal(themeCss({ color: "red" }), "");
    assert.equal(themeCss({ "--foam": "red;} body{display:none" }), "");
    assert.equal(themeCss({ "--foam": "</style><script>" }), "");
    assert.equal(themeCss({}), "");
  });
});

describe("clientConfig", () => {
  test("sends the browser what it needs and the coach flag from the server", () => {
    const config = defineLineup({ name: "Ada" });
    const sent = clientConfig(config, true);
    assert.equal(sent.name, "Ada");
    assert.equal(sent.coach.available, true);
    assert.equal(clientConfig(config, false).coach.available, false);
    assert.ok(!("theme" in sent), "the theme travels as CSS, not as config");
  });
});

describe("demoMode", () => {
  test("is on only for LINEUP_DEMO=1 outside production", () => {
    assert.equal(demoMode({ LINEUP_DEMO: "1" }), true);
    assert.equal(demoMode({ LINEUP_DEMO: "1", NODE_ENV: "development" }), true);
    assert.equal(demoMode({ LINEUP_DEMO: "1", NODE_ENV: "production" }), false);
    assert.equal(demoMode({ LINEUP_DEMO: "true" }), false);
    assert.equal(demoMode({}), false);
  });
});
