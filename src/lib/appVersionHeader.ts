import { supabase } from "@/integrations/supabase/client";
import { APP_VERSION } from "@/version";

/** Adds `x-app-version` to every supabase.functions.invoke call, centrally. */
const originalInvoke = supabase.functions.invoke.bind(supabase.functions);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(supabase.functions as any).invoke = (name: string, options: any = {}) =>
  originalInvoke(name, {
    ...options,
    headers: { ...(options?.headers || {}), "x-app-version": APP_VERSION },
  });
