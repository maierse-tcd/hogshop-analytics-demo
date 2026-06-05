import { useFeatureFlagEnabled } from "posthog-js/react";

export const FLASH_SALE_DISCOUNT = 0.2;
export const FLASH_SALE_FLAG = "promo-flash-sale";

export function useFlashSale() {
  const enabled = useFeatureFlagEnabled(FLASH_SALE_FLAG) === true;

  const getDiscountedPrice = (price: number) =>
    enabled ? +(price * (1 - FLASH_SALE_DISCOUNT)).toFixed(2) : price;

  const getDiscountAmount = (price: number) =>
    enabled ? +(price * FLASH_SALE_DISCOUNT).toFixed(2) : 0;

  return {
    flashSaleActive: enabled,
    discount: FLASH_SALE_DISCOUNT,
    discountPct: Math.round(FLASH_SALE_DISCOUNT * 100),
    getDiscountedPrice,
    getDiscountAmount,
  };
}
