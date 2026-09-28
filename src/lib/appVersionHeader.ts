import { supabase } from "@/integrations/supabase/client";
import { APP_VERSION } from "@/version";

/**
 * Adds `x-app-version` to every supabase.functions.invoke call, centrally.
 *
 * supabase-js v2 exposes `supabase.functions` as a getter that returns a NEW
 * FunctionsClient on every access, so patching the instance would be lost.
 * Patch the prototype instead so every instance picks it up, and guard with a
 * flag so HMR doesn't patch twice.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const proto = Object.getPrototypeOf(supabase.functions) as any;
if (!proto.__appVersionPatched) {
  proto.__appVersionPatched = true;
  const originalInvoke = proto.invoke;
  proto.invoke = function (name: string, options: any = {}) {
    return originalInvoke.call(this, name, {
      ...options,
      headers: { ...(options?.headers || {}), "x-app-version": APP_VERSION },
    });
  };
}
