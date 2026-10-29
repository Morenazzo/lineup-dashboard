import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { LINEUP_SHIM } from "../../lib/lineup/shim";
import { MAX_DOC_BYTES, parseMessages, parseRef, parseWrite, resolveModelId } from "../../lib/lineup/validate";

describe("lineup validation", () => {
  test("accepts the six collections and rejects others", () => {
    assert.deepEqual(parseRef({ coll: "weeks", id: "2026-W43" }), { coll: "weeks", id: "2026-W43" });
    assert.deepEqual(parseRef({ coll: "deals", id: "a1b2" }), { coll: "deals", id: "a1b2" });
    assert.equal(parseRef({ coll: "admins", id: "x" }), null);
    assert.equal(parseRef({ coll: "weeks", id: "../x" }), null);
    assert.equal(parseRef(null), null);
  });

  test("a write needs an object and stays under the size cap", () => {
    assert.ok(parseWrite({ coll: "tasks", id: "a1", data: { t: "Call Ana" } }) instanceof Object);
    assert.equal(parseWrite({ coll: "tasks", id: "a1", data: [] }), null);
    assert.equal(parseWrite({ coll: "tasks", id: "a1", data: "x" }), null);
    assert.equal(parseWrite({ coll: "chats", id: "c", data: { big: "x".repeat(MAX_DOC_BYTES) } }), "too_large");
  });

  test("messages must alternate into a final user turn within limits", () => {
    assert.ok(parseMessages([{ role: "user", content: "hola" }]));
    assert.equal(parseMessages([]), null);
    assert.equal(parseMessages([{ role: "assistant", content: "hola" }]), null);
    assert.equal(parseMessages([{ role: "system", content: "x" }]), null);
    assert.equal(parseMessages([{ role: "user", content: "  " }]), null);
  });

  test("only models the config offers are used; anything else falls back", () => {
    const allowed = ["anthropic/claude-opus-5.5", "anthropic/claude-haiku-5.5"];
    assert.equal(resolveModelId("anthropic/claude-opus-5.5", allowed, "fallback"), "anthropic/claude-opus-5.5");
    assert.equal(resolveModelId("", allowed, "fallback"), "fallback");
    assert.equal(resolveModelId("openai/gpt-9", allowed, "fallback"), "fallback");
    assert.equal(resolveModelId(42, allowed, "fallback"), "fallback");
  });

  test("the shim is valid JavaScript and defines window.claude.use", () => {
    assert.doesNotThrow(() => new Function(LINEUP_SHIM));
    assert.match(LINEUP_SHIM, /window\.claude = /);
  });
});
