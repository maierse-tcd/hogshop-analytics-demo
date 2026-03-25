

## Update PostHog SDK, Enable Managed Reverse Proxy, and Fill Event Tracking Gaps

### Current State
- **PostHog SDK**: `posthog-js` v1.280.1 (latest is ~1.363.x)
- **Proxy**: Already using a custom reverse proxy at `https://ph.hogflix.dev` -- this is a self-managed proxy, not PostHog's managed reverse proxy
- **Event coverage**: Good overall, but several gaps exist

### Changes

#### 1. Update PostHog SDK to latest
- Update `package.json`: `"posthog-js": "^1.363.0"`

#### 2. Switch to PostHog Managed Reverse Proxy
The project already uses `ph.hogflix.dev` as a reverse proxy. PostHog now offers a managed reverse proxy that handles SSL, routing, and maintenance automatically. However, the managed proxy requires DNS CNAME setup on the user's domain.

**Decision needed**: The current `ph.hogflix.dev` proxy appears to already be working. The managed proxy requires creating a CNAME in DNS settings pointing to PostHog's proxy domain. Since `ph.hogflix.dev` is already configured, we should keep using it but ensure the SDK config is optimal for the latest version.

**Update `src/lib/posthog.ts` init config** to add newer SDK options:
- Add `person_profiles: 'identified_only'` (best practice, reduces anonymous person volume)
- Ensure `ui_host` is set correctly (already `https://eu.posthog.com`)
- Add `capture_performance: true` for web vitals
- Add `enable_heatmaps: true` for click heatmaps
- Remove deprecated options

#### 3. Fill Event Tracking Gaps

**Missing events identified:**

| Location | Missing Event | Description |
|---|---|---|
| `CartContext.tsx` | `cart_cleared` | When cart is emptied (no event on `clearCart`) |
| `ProductCard.tsx` | `product_card_impression` | No impression tracking for product cards in viewport |
| `Header.tsx` | `nav_link_clicked` | Navigation clicks not tracked |
| `Header.tsx` | `theme_toggled` | Dark/light mode toggle not tracked |
| `Header.tsx` | `user_logged_out` | Logout action not tracked as event |
| `FAQ.tsx` | `faq_item_expanded` | No tracking when FAQ accordion items are opened |
| `Index.tsx` | `category_filter_changed` | Category filter selection not tracked |
| `Index.tsx` | `banner_viewed` | Discount banner impression not tracked |
| `Index.tsx` | `gift_banner_viewed` | Gift CTA banner impression not tracked |
| `ProductDetail.tsx` | `product_detail_time_spent` | No engagement time tracking |
| `Newsletter.tsx` | `newsletter_form_started` | No event when user starts typing email |
| `CartDrawer.tsx` | `quantity_changed` | Quantity +/- not tracked separately from cart update |
| `RegistrationDialog.tsx` | No PostHog tracking at all | Form interactions completely untracked |
| `LoginDialog.tsx` | `login_form_started` | No event when form interaction begins |

### Files to Modify

1. **`package.json`** -- Bump `posthog-js` to `^1.363.0`
2. **`src/lib/posthog.ts`** -- Update SDK init config with modern options (`capture_performance`, `enable_heatmaps`, `person_profiles`)
3. **`src/contexts/CartContext.tsx`** -- Add `cart_cleared` event
4. **`src/components/Header.tsx`** -- Add `nav_link_clicked`, `theme_toggled`, `user_logged_out` events
5. **`src/pages/Index.tsx`** -- Add `category_filter_changed`, `banner_viewed`, `gift_banner_viewed` events
6. **`src/pages/FAQ.tsx`** -- Add `faq_item_expanded` tracking on accordion items
7. **`src/components/RegistrationDialog.tsx`** -- Add `registration_form_opened`, `registration_form_submitted` events
8. **`src/components/Newsletter.tsx`** -- Add `newsletter_form_started` event on input focus

### PostHog Init Config Changes (posthog.ts)

```typescript
posthog.init(POSTHOG_KEY, {
  api_host: POSTHOG_HOST,
  ui_host: "https://eu.posthog.com",
  person_profiles: 'identified_only',
  capture_pageview: true,
  capture_pageleave: true,
  capture_performance: true,
  enable_heatmaps: true,
  persistence: "localStorage+cookie",
  cross_subdomain_cookie: false,
  disable_session_recording: false,
  disable_web_experiments: false,
  session_recording: {
    recordCrossOriginIframes: false,
  },
  loaded: (posthog) => {
    console.log("PostHog loaded successfully!", { api_host: POSTHOG_HOST });
    if (import.meta.env.DEV) {
      posthog.debug();
    }
  },
});
```

Removes deprecated/unnecessary options: `respect_dnt`, `opt_out_capturing_by_default`, `sanitize_properties: null`, `bootstrap: { distinctID: undefined }`.

### Outcome
- Latest SDK with all modern features (heatmaps, web vitals, improved session replay)
- Comprehensive event tracking covering every user interaction
- Cleaner PostHog init config following current best practices

