

## Additional Visual Improvements

After reviewing both light and dark modes, here are refinements that would add more polish:

### Issues Spotted

1. **Light mode hero feels washed out** -- The gradient is too subtle, making the hero section look flat compared to the rich dark mode version. The dot pattern and glow orbs are barely visible.

2. **Large empty gap before footer** -- There's significant whitespace between the last product row and the footer, making the page feel unfinished.

3. **Category filter pills lack active distinction** -- Selected vs unselected pills could use more visual differentiation (ring, shadow, or scale).

4. **Footer lacks visual warmth** -- The footer is minimal and could benefit from a subtle top gradient divider and slightly warmer background treatment.

5. **"Sign up for newsletter" button is flat in light mode** -- The outline variant blends into the background; it could benefit from a subtle hover glow or border accent.

6. **Product card images have no loading state polish** -- When images load, there's no smooth fade-in, which can feel jarring.

7. **No scroll-to-top behavior** -- When navigating between pages, scroll position isn't always reset.

### Proposed Changes

| File | Change |
|---|---|
| `src/pages/Index.tsx` | Increase hero gradient intensity for light mode (`from-primary/15` instead of `/10`), reduce gap before footer (`mt-24` to `mt-12`) |
| `src/pages/Index.tsx` | Add `ring-2 ring-primary ring-offset-2` to active category button for stronger visual distinction |
| `src/components/ProductCard.tsx` | Add image `loading="lazy"` and a CSS fade-in on load for smoother image appearance |
| `src/index.css` | Add a subtle `@keyframes fadeIn` for image load transitions |
| `src/pages/Index.tsx` | Outline newsletter button: add `border-primary/30 hover:border-primary` for more presence in light mode |

### Technical Details

All changes are CSS/className only -- no logic or tracking changes. Estimated 5 small edits across 3 files.

