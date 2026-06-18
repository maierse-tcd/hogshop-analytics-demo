import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    // Emit source maps for production builds so PostHog Error Tracking can
    // resolve the minified frames (e.g. `Yn`/`LS`/`BS` in index-*.js) back to
    // real source locations. Upload them after each build with the PostHog CLI
    // (see README → "Uploading source maps to PostHog"). Without this, every
    // bundle rebuild produces a fresh, unsymbolicated error fingerprint.
    sourcemap: true,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
