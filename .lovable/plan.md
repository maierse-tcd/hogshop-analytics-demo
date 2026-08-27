# HogShop UI/UX refresh

A visual and interaction overhaul across the whole app, keeping every feature flag, experiment, analytics event and `data-attr` hook exactly as it is today. Purely presentation-layer work.

## Direction

- Brand orange stays the single accent; neutrals get a deeper, layered scale (page background, raised surface, hairline borders) in both light and dark mode.
- Typography: Space Grotesk for headings, DM Sans for body, loaded via Google Fonts and wired into the Tailwind theme.
- Homepage keeps its hero + card grid structure, but tightened: calmer hero, clearer category filter row, denser and more consistent product cards.

## What changes

**Design system (tokens first)**
- Add surface/elevation tokens, refined borders, softer radii, and a small set of shadow + gradient tokens in `index.css` / `tailwind.config.ts`.
- Replace the current global `transition: all`-style rule with targeted, cheaper transitions so hover states feel crisp rather than laggy.
- Consistent focus-visible rings, and `prefers-reduced-motion` respected for the floating/blinking animations.

**Header & navigation**
- Cleaner nav with clearer active state, better spacing, a compact cart badge, and a mobile sheet nav instead of the cramped desktop row.
- Theme toggle, login and cart get consistent icon-button treatment and tooltips/labels for accessibility.

**Homepage**
- Hero: reduced headline size, better line rhythm, real supporting content instead of empty vertical space, primary/secondary CTA hierarchy.
- Category filters become a scrollable chip row with obvious selected state.
- Product grid: aligned card heights, consistent image aspect ratio, badge stacking rules so flash-sale / low-stock / subscription badges never collide, skeleton loading states.

**Product detail, cart, checkout, success**
- Product page: two-column layout with sticky buy panel, clearer price/subscription block, tidier related-products carousel.
- Cart drawer: clearer line items, quantity controls, sticky totals footer, better empty state.
- Registration / login / subscription dialogs: consistent form styling, inline validation appearance, clearer primary action.
- Success page: single celebratory summary card instead of stacked blocks.

**Content pages**
- About, FAQ, Shipping, Terms, Readme, Live stats and the gift/404 pages get a shared page shell (page title block, readable measure, consistent section spacing). Live stats charts get themed colors, axis/legend cleanup and proper loading/empty states.

**Peripheral UI**
- Flash sale banner, newsletter block, NPS/exit-intent surveys, loyalty prompt, sticky checkout bar, AI chat widget and tour tooltips restyled to the same system — each keeps its existing flag gate and variant branches untouched.

## Guardrails

- No changes to `useFeatureFlagEnabled` / `useFeatureFlagVariantKey` calls, flag keys, variant names, or which branch renders when.
- Every experiment variant (product card v2, add-to-cart CTA copy, subscription highlight, sticky checkout, seasonal themes, flash sale) is restyled in both control and test branches so the test stays a fair comparison.
- All `data-attr` values, PostHog event names and properties, and bot-facing semantic selectors (roles, visible text) preserved.
- No backend, edge function, schema or business-logic changes.

## Technical notes

- Fonts added in `index.html` with `display=swap` and mapped to `fontFamily.sans` / `fontFamily.display` in `tailwind.config.ts`.
- All color work goes through HSL semantic tokens; no hardcoded color utilities in components.
- Seasonal theme inline styles in `ProductCard` stay driven by `seasonalThemes.ts`; only the surrounding neutral styling changes.
- Verification: build check, plus a headless pass over `/`, `/product/:id`, `/about`, `/live` and `/success` in both light and dark mode at desktop and mobile widths, confirming no console errors and that flag-gated components still render.
