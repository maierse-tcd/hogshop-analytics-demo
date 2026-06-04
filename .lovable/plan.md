## Diagnosis

The carousel you're seeing in indigo/violet is on the **published** site (`hogshop-analytics-demo.lovable.app`), not the current preview build.

Searched all four treatment components for any off-brand color references:

```
rg "indigo|violet|blue|purple|#6366|#8b5c|#14b8|#10b9" \
  src/components/RelatedProductsCarousel.tsx \
  src/components/StickyCheckoutBar.tsx \
  src/components/LoyaltyPrompt.tsx \
  src/components/CartDrawer.tsx
→ no matches
```

`RelatedProductsCarousel.tsx` is already using orange semantic tokens:

- "Recommended" chip → `bg-primary/10 text-primary`
- Heading → `text-foreground`
- Price → `text-primary`
- Add to Cart CTA → `bg-primary text-primary-foreground hover:bg-primary/90`
- Image background → `bg-accent/5` (neutral)

`--primary` is `17 100% 48%` (PostHog orange) in both light and dark mode in `index.css`. So in the preview, the carousel should already render in orange.

## What to do

No code changes needed. The fix from the previous turn is in the source; the published bundle just needs to be redeployed.

1. Open the publish dialog and click Publish to push the latest preview build live.
2. Hard refresh `hogshop-analytics-demo.lovable.app/product/...` (Cmd/Ctrl + Shift + R) to bypass the cached JS bundle.
3. Verify the carousel chip, heading, price, and CTA all render orange.

If after republishing the carousel still looks indigo, send a screenshot of the **preview** URL (the one ending in `lovable.app` that mirrors the editor) so I can confirm whether it's a build vs. cache issue and dig deeper.

## Files

None — no edits required.
