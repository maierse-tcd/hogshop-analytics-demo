import { useEffect, useState } from "react";
import { useFeatureFlagEnabled, useFeatureFlagPayload } from "posthog-js/react";

export const FLASH_SALE_DISCOUNT = 0.2;
export const FLASH_SALE_FLAG = "promo-flash-sale";

/**
 * Read the server-authoritative sale end time from the `promo-flash-sale` flag
 * payload. The payload may carry `ends_at` as either epoch milliseconds or an
 * ISO-8601 string; a missing/unparseable value means "no scheduled end".
 *
 * This is the single source of truth for the sale window — the discount gating
 * below and the countdown in FlashSaleBanner both derive from it, so the timer
 * and the discount can no longer disagree (previously the discount was gated by
 * the flag alone while the banner ran its own client-clock countdown, which
 * drifted to "00:00:00" on backgrounded tabs while the discount stayed on).
 */
export function getFlashSaleEndsAt(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = (payload as Record<string, unknown>).ends_at;
  if (raw == null) return null;
  const ms = typeof raw === "number" ? raw : Date.parse(String(raw));
  return Number.isFinite(ms) ? ms : null;
}

export function useFlashSale() {
  const flagEnabled = useFeatureFlagEnabled(FLASH_SALE_FLAG) === true;
  const payload = useFeatureFlagPayload(FLASH_SALE_FLAG);
  const endsAt = getFlashSaleEndsAt(payload);

  // Re-render exactly when the sale window closes so the discount ends at the
  // same instant the countdown hits zero. A single timeout (rather than a
  // per-second interval) keeps this cheap even though every ProductCard calls
  // this hook.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!flagEnabled || endsAt == null) return;
    const ms = endsAt - Date.now();
    if (ms <= 0) return;
    const id = window.setTimeout(() => forceTick((n) => n + 1), ms);
    return () => window.clearTimeout(id);
  }, [flagEnabled, endsAt]);

  const enabled = flagEnabled && (endsAt == null || Date.now() < endsAt);

  const getDiscountedPrice = (price: number) =>
    enabled ? +(price * (1 - FLASH_SALE_DISCOUNT)).toFixed(2) : price;

  const getDiscountAmount = (price: number) =>
    enabled ? +(price * FLASH_SALE_DISCOUNT).toFixed(2) : 0;

  return {
    flashSaleActive: enabled,
    endsAt: enabled ? endsAt : null,
    discount: FLASH_SALE_DISCOUNT,
    discountPct: Math.round(FLASH_SALE_DISCOUNT * 100),
    getDiscountedPrice,
    getDiscountAmount,
  };
}
