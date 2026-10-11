import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readdirSync } from "node:fs";
import { resolve, relative } from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: "decorative-source-inventory",
    resolveId: (id) => id === "virtual:decorative-sources" ? "\0virtual:decorative-sources" : undefined,
    load(id) {
      if (id !== "\0virtual:decorative-sources") return;
      const root = resolve(import.meta.dirname, "public");
      const sources = readdirSync(resolve(root, "template-assets"), { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => "/" + relative(root, resolve(entry.parentPath, entry.name)).replaceAll("\\", "/"));
      return `export default ${JSON.stringify(sources)}`;
    },
  }],
});
