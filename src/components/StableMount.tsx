import type { ReactNode } from "react";

interface StableMountProps {
  children?: ReactNode;
  className?: string;
}

/**
 * Wraps a feature-flag-gated or otherwise async subtree in a stable,
 * React-owned container that stays mounted for the lifetime of the app while
 * only its *contents* toggle.
 *
 * Why this exists: feature flags resolve asynchronously, after first paint.
 * Rendering a gated component as a bare fragment sibling — `{flag && <Widget/>}`
 * — means the mount/unmount happens at the top of the tree and shifts sibling
 * DOM nodes after React has already committed. If a browser translation
 * extension (Google Translate, Firefox's built-in translator, ...) has
 * meanwhile rewrapped nearby text nodes in `<font>`/`<span>` wrappers, React's
 * commit-phase `removeChild` traversal can target a node that is no longer
 * where the fiber tree expects it, throwing the recurring non-fatal
 * `DOMException: NotFoundError: ... removeChild ...`.
 *
 * Keeping a constant boundary element here means React only ever adds/removes
 * nodes *inside* a container it fully owns, and `translate="no"` asks those
 * extensions to leave the boundary — and the dynamic content within — alone.
 *
 * The wrapper is `display: contents` so it never affects layout: it is purely
 * a DOM-reconciliation anchor, not a visual box.
 */
export const StableMount = ({ children, className }: StableMountProps) => (
  <div
    data-stable-mount=""
    translate="no"
    style={{ display: "contents" }}
    className={className}
  >
    {children}
  </div>
);
