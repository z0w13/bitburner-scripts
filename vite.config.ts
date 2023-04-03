/* eslint-env node */
import { defineConfig } from "viteburner"
import { resolve } from "path"
export default defineConfig({
  /** basic vite configs */
  resolve: {
    alias: {
      /** path to your source code */
      "@": resolve(__dirname, "src"),
    },
  },
  build: { minify: false, outDir: "dist", emptyOutDir: true },
  /** viteburner configs */
  viteburner: {
    watch: [{ pattern: "src/**/*.{js,ts}", transform: true }, { pattern: "src/**/*.{script,txt}" }],
    sourcemap: "inline",
  },
})
