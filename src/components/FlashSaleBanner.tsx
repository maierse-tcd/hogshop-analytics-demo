import { useEffect, useRef, useState } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFlashSale } from "@/hooks/useFlashSale";
import { trackEvent } from "@/lib/posthog";

const TARGET_KEY = "flash_sale_target_ts";

function getOrCreateTarget(): number {
  const now = Date.now();
  const raw = localStorage.getItem(TARGET_KEY);
  if (raw) {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n) && n > now) return n;
  }
  const next = new Date();
  next.setHours(24, 0, 0, 0); // next local midnight
  localStorage.setItem(TARGET_KEY, String(next.getTime()));
  return next.getTime();
}

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}:${p(s)}`;
}

export const FlashSaleBanner = () => {
  const { flashSaleActive, discountPct } = useFlashSale();
  const [target, setTarget] = useState<number>(() => (typeof window !== "undefined" ? getOrCreateTarget() : 0));
  const [remaining, setRemaining] = useState<string>("00:00:00");
  const shownRef = useRef(false);

  useEffect(() => {
    if (!flashSaleActive) return;
    if (!shownRef.current) {
      shownRef.current = true;
      const sessionKey = "flash_sale_banner_shown_session";
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, "1");
        trackEvent("flash_sale_banner_shown", { discount_pct: discountPct });
      }
    }
  }, [flashSaleActive, discountPct]);

  useEffect(() => {
    if (!flashSaleActive) return;
    const tick = () => {
      const now = Date.now();
      if (now >= target) {
        const next = new Date();
        next.setHours(24, 0, 0, 0);
        localStorage.setItem(TARGET_KEY, String(next.getTime()));
        setTarget(next.getTime());
        setRemaining(formatRemaining(next.getTime() - now));
      } else {
        setRemaining(formatRemaining(target - now));
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [flashSaleActive, target]);

  if (!flashSaleActive) return null;

  const handleCta = () => {
    trackEvent("flash_sale_cta_clicked", { discount_pct: discountPct });
    const el = document.getElementById("products");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (typeof window !== "undefined") {
      window.location.href = "/#products";
    }
  };

  return (
    <div
      className="sticky top-16 z-40 w-full text-primary-foreground shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6)]"
      style={{
        background:
          "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(17 100% 55%) 50%, hsl(var(--primary)) 100%)",
      }}
      data-attr="flash-sale-banner"
    >
      <div className="container flex flex-col sm:flex-row items-center justify-between gap-3 py-2.5">
        <div className="flex items-center gap-3 text-sm md:text-base font-bold">
          <Zap className="h-5 w-5 fill-current drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
          <span className="tracking-wide">
            24-HOUR FLASH SALE — {discountPct}% OFF EVERYTHING
          </span>
          <span
            className="ml-2 font-mono rounded-md bg-black/25 px-2.5 py-0.5 text-sm tabular-nums backdrop-blur-sm"
            aria-label="Time remaining"
          >
            {remaining}
          </span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleCta}
          className="rounded-full font-semibold bg-background text-primary hover:bg-background/90 shadow-[0_0_16px_hsl(var(--primary)/0.5)]"
        >
          Shop the sale
        </Button>
      </div>
    </div>
  );
};
