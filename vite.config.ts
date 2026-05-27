import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

const reactDedupe = [
  "react",
  "react-dom",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "@tanstack/react-query",
  "@tanstack/query-core",
];

export default defineConfig(({ mode }) => {
  const loadedEnv = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine = Object.fromEntries(
    Object.entries(loadedEnv).map(([key, value]) => [
      `import.meta.env.${key}`,
      JSON.stringify(value),
    ]),
  );

  return {
    define: envDefine,
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
      dedupe: reactDedupe,
    },
    plugins: [
      tanstackStart(),
      nitro({
        config: {
          preset: "vercel",
          vercel: {
            entryFormat: "node",
            functions: {
              runtime: "nodejs22.x",
            },
          },
        },
      }),
      viteReact(),
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
    ],
    server: {
      host: "::",
      port: 8080,
    },
  };
});
