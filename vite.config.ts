import { defineConfig } from "vite";
// Hashed bundles live in js/ and css/ so Cloudflare Pages can cache them as
// immutable (see public/_headers). Unhashed game art stays in assets/.
export default defineConfig({
  base: "./",
  build: {
    // Safari 13+ (iOS 13+): syntax is lowered; runtime gaps are filled by src/compat.ts.
    target: ["es2019", "safari13", "chrome80", "firefox78"],
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        entryFileNames: "js/[name]-[hash].js",
        chunkFileNames: "js/[name]-[hash].js",
        assetFileNames: "css/[name]-[hash][extname]",
        manualChunks: { phaser: ["phaser"] },
      },
    },
  },
});
