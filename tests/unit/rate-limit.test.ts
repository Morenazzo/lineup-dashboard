import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";

describe("rate limiter", () => {
  test("allows up to the limit, then refuses until the window passes", () => {
    const allow = createRateLimiter({ windowMs: 1000, max: 2 });
    assert.equal(allow("a", 0), true);
    assert.equal(allow("a", 100), true);
    assert.equal(allow("a", 200), false);
    assert.equal(allow("a", 999), false);
    assert.equal(allow("a", 1000), true, "the first hit has expired");
    assert.equal(allow("a", 1050), false, "the second is still inside the window");
    assert.equal(allow("a", 1100), true);
  });

  test("keys are independent", () => {
    const allow = createRateLimiter({ windowMs: 1000, max: 1 });
    assert.equal(allow("a", 0), true);
    assert.equal(allow("b", 0), true);
    assert.equal(allow("a", 1), false);
  });

  test("a refused attempt does not extend the block", () => {
    const allow = createRateLimiter({ windowMs: 1000, max: 1 });
    assert.equal(allow("a", 0), true);
    for (let t = 1; t < 900; t += 100) assert.equal(allow("a", t), false);
    assert.equal(allow("a", 1000), true);
  });

  test("keeps working across the periodic cleanup", () => {
    const allow = createRateLimiter({ windowMs: 10, max: 1 });
    for (let i = 0; i < 1200; i++) assert.equal(allow(`k${i}`, i), true);
    assert.equal(allow("k1199", 1200), false);
  });
});

describe("client IP", () => {
  test("is the first address of x-forwarded-for, else x-real-ip, else unknown", () => {
    assert.equal(clientIp(new Request("https://x.test", { headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" } })), "1.2.3.4");
    assert.equal(clientIp(new Request("https://x.test", { headers: { "x-real-ip": "5.6.7.8" } })), "5.6.7.8");
    assert.equal(clientIp(new Request("https://x.test")), "unknown");
  });
});
