## Goal

Re-skin the four A/B test treatments so they fit HogShop's existing PostHog design system (orange `--primary`, yellow, blue accents) instead of the off-brand teal / emerald / indigo / violet currently hardcoded.

## Current vs. proposed

| Treatment | Current color | Proposed |
|---|---|---|
| `StickyCheckoutBar` | teal `#14b8a6` | `bg-primary text-primary-foreground`, button `bg-background text-primary` |
| `CartDrawer` free-shipping nudge | emerald `#10b981` | `bg-yellow` border + fill, text uses `text-yellow` / `text-foreground` |
| `RelatedProductsCarousel` | indigo `#6366f1` | `text-primary`, `bg-primary/10` chip, `bg-primary text-primary-foreground` CTA |
| `LoyaltyPrompt` | violet `#8b5cf6` | `bg-blue` accent or `bg-primary/5` card with `bg-primary` CTA |

## Approach

- Remove all inline `style={{ backgroundColor: "#..." }}` / hex literals from the 4 components.
- Use semantic Tailwind tokens already defined in `index.css` / `tailwind.config.ts`: `primary`, `primary-foreground`, `yellow`, `yellow-foreground`, `blue`, `blue-foreground`, `background`, `foreground`, `muted`, `border`.
- Keep each treatment visually distinct from one another by using a different token per treatment (primary / yellow / primary-outline / blue) rather than four different off-palette hexes.
- Keep all logic, flag gating, `data-attr` hooks, tracking, and DOM structure unchanged. Pure presentation change.

## Files

- `src/components/StickyCheckoutBar.tsx`
- `src/components/CartDrawer.tsx` (only the free-shipping nudge block)
- `src/components/RelatedProductsCarousel.tsx`
- `src/components/LoyaltyPrompt.tsx`

No new files, no token changes to `index.css` / `tailwind.config.ts` (existing tokens cover it).