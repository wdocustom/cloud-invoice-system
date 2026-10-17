import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { geminiGenerate, geminiModelChain, isModelUnavailable } from "./gemini";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Fake Gemini: maps model → [status, body], records the order models were tried. */
function fakeGemini(responses: Record<string, [number, string]>) {
  const tried: string[] = [];
  globalThis.fetch = (async (url: string) => {
    const model = decodeURIComponent(String(url).match(/models\/([^:]+):/)![1]);
    tried.push(model);
    const [status, body] = responses[model] ?? [500, "unexpected"];
    return new Response(body, { status });
  }) as typeof fetch;
  return tried;
}

test("the preferred model is tried first, the retiring one last", () => {
  assert.deepEqual(geminiModelChain(""), ["gemini-3.8-flash", "gemini-2.5-flash"]);
});

test("GEMINI_MODEL pins a model ahead of the defaults, without duplicates", () => {
  assert.deepEqual(geminiModelChain("gemini-3.7-flash"), ["gemini-3.7-flash", "gemini-3.8-flash", "gemini-2.5-flash"]);
  assert.deepEqual(geminiModelChain("gemini-2.5-flash"), ["gemini-2.5-flash", "gemini-3.8-flash"]);
});

test("only model-availability failures count as unavailable", () => {
  assert.equal(isModelUnavailable(404, ""), true);
  assert.equal(isModelUnavailable(400, "models/gemini-9 is not found for API version v1beta"), true);
  assert.equal(isModelUnavailable(400, "This model is deprecated"), true);
  assert.equal(isModelUnavailable(400, "Invalid JSON payload received"), false);
  assert.equal(isModelUnavailable(429, "Resource exhausted"), false);
  assert.equal(isModelUnavailable(500, "not found"), false, "server errors aren't a model problem");
});

test("uses the preferred model when it works", async () => {
  const tried = fakeGemini({ "gemini-3.8-flash": [200, "{}"] });
  const res = await geminiGenerate("k", {}, ["gemini-3.8-flash", "gemini-2.5-flash"]);
  assert.equal(res.status, 200);
  assert.deepEqual(tried, ["gemini-3.8-flash"]);
});

test("falls back when the preferred model doesn't exist", async () => {
  const tried = fakeGemini({ "gemini-3.8-flash": [404, "not found"], "gemini-2.5-flash": [200, "{}"] });
  const res = await geminiGenerate("k", {}, ["gemini-3.8-flash", "gemini-2.5-flash"]);
  assert.equal(res.status, 200);
  assert.deepEqual(tried, ["gemini-3.8-flash", "gemini-2.5-flash"]);
});

test("a rate limit is returned, not hidden behind a model swap", async () => {
  const tried = fakeGemini({ "gemini-3.8-flash": [429, "Resource exhausted"] });
  const res = await geminiGenerate("k", {}, ["gemini-3.8-flash", "gemini-2.5-flash"]);
  assert.equal(res.status, 429);
  assert.deepEqual(tried, ["gemini-3.8-flash"]);
});

test("if every model is gone, the last failure comes back with a readable body", async () => {
  fakeGemini({ "gemini-3.8-flash": [404, "a"], "gemini-2.5-flash": [404, "b is not found"] });
  const res = await geminiGenerate("k", {}, ["gemini-3.8-flash", "gemini-2.5-flash"]);
  assert.equal(res.status, 404);
  assert.equal(await res.text(), "b is not found");
});
