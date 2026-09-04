import { useFeatureFlagVariantKey } from "posthog-js/react";

export const SIGNUP_DISCOUNT_FLAG = "increase_sales_cta";

// Discount shown to shoppers who are not in a discount variant of
// `increase_sales_cta` (control group, or the flag not yet resolved). One
// agreed value so every always-on promotional surface shows the same number.
export const DEFAULT_SIGNUP_DISCOUNT = 15;

export function useSignupDiscount() {
  const variant = useFeatureFlagVariantKey(SIGNUP_DISCOUNT_FLAG);

  const variantPercent =
    variant === "10percent" ? 10 : variant === "15percent" ? 15 : undefined;

  return {
    // Raw experiment variant key, or undefined for control/unresolved.
    variant,
    // Discount tied to the experiment variant; undefined for control.
    variantPercent,
    // Discount for always-on promo surfaces; falls back for control.
    displayPercent: variantPercent ?? DEFAULT_SIGNUP_DISCOUNT,
  };
}
