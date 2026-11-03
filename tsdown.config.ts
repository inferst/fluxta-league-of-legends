import { isBuiltin } from "node:module";
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/capture.ts"],
  format: ["esm"],
  outDir: "dist/lol",
  clean: true,
  deps: { alwaysBundle: (id) => !isBuiltin(id), onlyBundle: false },
  copy: [
    { from: "manifest.json" },
    { from: "icons/*.svg", to: "dist/lol/icons" },
  ],
});
