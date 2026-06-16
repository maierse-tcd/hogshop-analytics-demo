import { useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TourStep } from "@/hooks/useTour";

interface TourTooltipProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onDismiss: () => void;
}

/**
 * Reusable display component for a single tour step. Anchors itself to the
 * step's `target` element, highlights it via the `data-tour-active` attribute,
 * and exposes Next / Dismiss controls. Styled with the app's shadcn tokens.
 */
export function TourTooltip({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onDismiss,
}: TourTooltipProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const target = document.querySelector(step.target);
    if (!target) {
      setPosition(null);
      return;
    }

    // Bring the highlighted element into view before measuring.
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.setAttribute("data-tour-active", "true");

    const place = () => {
      if (!tooltipRef.current) return;
      const rect = target.getBoundingClientRect();
      const tip = tooltipRef.current.getBoundingClientRect();
      const placement = step.placement ?? "bottom";
      const GAP = 12;

      const top =
        placement === "bottom"
          ? rect.bottom + GAP + window.scrollY
          : placement === "top"
            ? rect.top - tip.height - GAP + window.scrollY
            : rect.top + rect.height / 2 - tip.height / 2 + window.scrollY;
      const left =
        placement === "left"
          ? rect.left - tip.width - GAP + window.scrollX
          : placement === "right"
            ? rect.right + GAP + window.scrollX
            : rect.left + rect.width / 2 - tip.width / 2 + window.scrollX;

      // Keep the tooltip within the horizontal viewport bounds.
      const maxLeft = window.scrollX + window.innerWidth - tip.width - 8;
      const clampedLeft = Math.max(window.scrollX + 8, Math.min(left, maxLeft));
      setPosition({ top: Math.max(window.scrollY + 8, top), left: clampedLeft });
    };

    place();
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("resize", place);
      target.removeAttribute("data-tour-active");
    };
  }, [step]);

  return (
    <div
      ref={tooltipRef}
      style={{
        position: "absolute",
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        zIndex: 9999,
      }}
      className="w-[300px] max-w-[calc(100vw-2rem)] rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg animate-in fade-in zoom-in-95 duration-200"
      role="dialog"
      aria-label={step.title}
    >
      <button
        onClick={onDismiss}
        aria-label="Close tour"
        className="absolute right-2 top-2 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <h4 className="mb-1.5 pr-5 text-sm font-semibold">{step.title}</h4>
      <p className="mb-3 text-sm text-muted-foreground">{step.body}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {stepIndex + 1} / {totalSteps}
        </span>
        <Button size="sm" onClick={onNext}>
          {stepIndex === totalSteps - 1 ? "Done" : "Next"}
        </Button>
      </div>
    </div>
  );
}
