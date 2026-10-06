import { defineConfig } from "vite";
// Hashed bundles live in js/ and css/ so Cloudflare Pages can cache them as
// immutable (see public/_headers). Unhashed game art stays in assets/.
export default defineConfig({
  base: "./",
  build: {
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
