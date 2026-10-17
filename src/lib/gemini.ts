/**
 * Every Gemini call in the app goes through here, so the model is chosen in
 * one place.
 *
 * All four AI features (instant estimate, scope generation, scope amendment,
 * sample scanning) hard-coded `gemini-2.5-flash`. That model is on Google's
 * retirement path: Vertex lists it as retiring Oct 20, 2026, and the Gemini
 * Developer API this app uses has limited it to existing users since Sep 18,
 * 2026 with no firm shutdown date. When it goes, every AI feature stops at
 * once.
 *
 * So: try the current model first, and fall back to the next one only when
 * Google says the model itself isn't available (retired, renamed, or not
 * enabled for this key). Ordinary failures — rate limits, timeouts, bad
 * requests — are returned as-is rather than retried on another model, so a
 * real problem isn't hidden behind a silent model swap.
 *
 * Override with GEMINI_MODEL to pin a model without a deploy.
 */

export const PREFERRED_GEMINI_MODEL = "gemini-3.8-flash";
export const FALLBACK_GEMINI_MODEL = "gemini-2.5-flash";

export function geminiModelChain(override = process.env.GEMINI_MODEL): string[] {
  const chain = [(override || "").trim(), PREFERRED_GEMINI_MODEL, FALLBACK_GEMINI_MODEL].filter(Boolean);
  return Array.from(new Set(chain));
}

/**
 * True when the failure is about the model being unavailable, as opposed to
 * the request or the service. Only these move on to the next model.
 */
export function isModelUnavailable(status: number, body: string): boolean {
  if (status === 404) return true;
  if (status !== 400 && status !== 403) return false;
  return /not found|is not supported|no longer (available|supported)|deprecated|retired|unknown model|does not have access to model/i.test(body);
}

export async function geminiGenerate(
  apiKey: string,
  body: Record<string, unknown>,
  models: string[] = geminiModelChain()
): Promise<Response> {
  let last: Response | null = null;

  for (const model of models) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    if (response.ok) return response;

    const text = await response.clone().text().catch(() => "");
    if (!isModelUnavailable(response.status, text)) return response;

    console.warn(`[gemini] ${model} unavailable (${response.status}); trying the next model. ${text.slice(0, 200)}`);
    last = response;
  }

  return last!;
}
