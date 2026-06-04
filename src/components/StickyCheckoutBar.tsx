import { useFeatureFlagVariantKey } from "posthog-js/react";
import { useLocation } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useCheckout } from "@/contexts/CheckoutContext";

export const StickyCheckoutBar = () => {
  const variant = useFeatureFlagVariantKey("exp-sticky-checkout");
  const { items, totalItems, totalPrice } = useCart();
  const { startCheckout, isCheckingOut } = useCheckout();
  const location = useLocation();

  if (variant !== "test") return null;
  if (items.length === 0) return null;
  if (location.pathname.startsWith("/success")) return null;

  return (
    <div
      data-attr="sticky-checkout-bar"
      className="fixed bottom-0 left-0 right-0 z-40 shadow-lg"
      style={{ backgroundColor: "#14b8a6", color: "#ffffff" }}
    >
      <div className="container flex items-center justify-between gap-4 py-3">
        <div className="flex items-center gap-4 text-sm sm:text-base font-medium">
          <span>
            {totalItems} {totalItems === 1 ? "item" : "items"}
          </span>
          <span className="opacity-80">·</span>
          <span className="font-bold">${totalPrice.toFixed(2)}</span>
        </div>
        <button
          onClick={startCheckout}
          disabled={isCheckingOut}
          className="rounded-md px-4 sm:px-6 py-2 font-semibold transition active:scale-[0.98] hover:-translate-y-0.5 disabled:opacity-60"
          style={{ backgroundColor: "#ffffff", color: "#0f766e" }}
        >
          {isCheckingOut ? "Processing..." : "Checkout now →"}
        </button>
      </div>
    </div>
  );
};
