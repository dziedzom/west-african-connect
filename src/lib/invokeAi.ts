import { supabase } from "@/integrations/supabase/client";

const FALLBACK_ERROR = "Our AI assistant is busy right now — please try again in a moment.";

/**
 * Calls an AI edge function and surfaces the server's own error message.
 *
 * supabase-js throws a FunctionsHttpError for any non-2xx response and leaves
 * `data` null, which hides the specific message the function returned (Pro
 * required, trial expired, monthly limit reached). This reads the response body
 * so the UI can show it.
 */
export async function invokeAi<T = unknown>(
  fn: string,
  body: Record<string, unknown>,
): Promise<{ result?: T; error?: string; code?: string }> {
  const { data, error } = await supabase.functions.invoke(fn, { body });

  if (error) {
    const response = (error as { context?: Response }).context;
    if (response && typeof response.json === "function") {
      try {
        const payload = await response.json();
        if (payload?.error) return { error: payload.error, code: payload.code };
      } catch {
        // fall through to the generic message
      }
    }
    return { error: FALLBACK_ERROR };
  }

  if (data?.error) return { error: data.error, code: data.code };
  return { result: data as T };
}
