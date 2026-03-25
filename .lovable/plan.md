

## Design Polish -- Light & Dark Mode Improvements

After reviewing all major components, here are targeted design refinements to add visual polish and a modern feel without breaking any functionality.

### Changes Overview

#### 1. CSS Design System (`src/index.css`)
- Add smooth global transitions for theme switching (`transition: background-color 0.3s, color 0.3s, border-color 0.3s`)
- Add subtle selection color styling
- Improve dark mode card color to a slightly warmer tone for depth
- Add a subtle body texture/grain overlay for premium feel (CSS-only, no images)

#### 2. Header (`src/components/Header.tsx`)
- Add a subtle bottom shadow instead of just a border for depth
- Active nav link indicator (underline for current route)
- Smooth hover transitions on nav links with slight translateY micro-interaction

#### 3. Product Cards (`src/components/ProductCard.tsx`)
- Add `hover:-translate-y-1` for a lift effect on hover
- Subtle gradient overlay on image on hover for depth
- Smoother border-radius and shadow transitions
- Price styling with a slight background pill

#### 4. Hero Section (`src/pages/Index.tsx`)
- Refine the hero gradient to be more subtle and sophisticated
- Reduce the dot pattern opacity slightly for cleanliness
- Add a subtle text-shadow to the hero heading for depth
- Improve the gift CTA banner with a cleaner glass-morphism look
- Better category filter pill styling with active state ring

#### 5. Footer (`src/pages/Index.tsx`)
- Add a subtle gradient separator line instead of plain border
- Slightly increase padding and spacing for breathing room

#### 6. About Page (`src/pages/About.tsx`)
- Fix the gradient text on "HogShop" heading (same issue as logo was -- use solid `text-primary` instead)
- Add subtle hover effects on the feature cards

#### 7. FAQ Page (`src/pages/FAQ.tsx`)
- Add hover background transition on accordion items
- Subtle left border accent on expanded items

#### 8. Shipping Page (`src/pages/Shipping.tsx`)
- Add hover lift effect on shipping method cards
- Icon containers with subtle background circles

#### 9. Global Button Polish (`src/components/ui/button.tsx`)
- Add `transition-all` instead of just `transition-colors` so transforms and shadows also animate
- Add subtle active state `scale-[0.98]` for tactile feel

#### 10. Card Component (`src/components/ui/card.tsx`)
- Add `transition-all duration-300` for smooth hover effects globally

#### 11. Tailwind Config (`tailwind.config.ts`)
- Add a subtle `float` keyframe animation for decorative elements (alternative to aggressive bounce)

### Technical Details

**Files to modify:**
1. `src/index.css` -- Global transitions, selection colors, subtle grain texture
2. `src/components/Header.tsx` -- Shadow, active link styling
3. `src/components/ProductCard.tsx` -- Hover lift, image overlay
4. `src/pages/Index.tsx` -- Hero refinements, gift banner glass-morphism, footer gradient
5. `src/pages/About.tsx` -- Fix gradient text, card hover
6. `src/pages/FAQ.tsx` -- Accordion hover/active styling
7. `src/pages/Shipping.tsx` -- Card hover lift
8. `src/components/ui/button.tsx` -- `transition-all` + active scale
9. `src/components/ui/card.tsx` -- Default transition
10. `tailwind.config.ts` -- Float animation keyframe

All changes are CSS/className-only. No logic, state, or event tracking changes. No functionality affected.

