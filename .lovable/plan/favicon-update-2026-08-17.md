# Favicon update

Use the uploaded hedgehog-in-a-box image as the site's favicon.

## Steps
1. Copy the uploaded image from `/mnt/user-uploads/Screen_Shot_2026-08-17_at_15.10.44_PM.png` to a writable temp path.
2. Resize and pad it to a 64×64 square transparent PNG, preserving the subject proportions (no stretch).
3. Save the result as `public/favicon.png`.
4. Update `index.html` to reference `/favicon.png` with `type="image/png"`.
5. Remove the existing `public/favicon.ico` so browsers don't keep showing the old icon.

## Outcome
The browser tab for HogShop will show the hedgehog-in-a-box favicon on all pages.