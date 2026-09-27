import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  // LinuxForge server code intentionally reads secrets/config from process.env.
  // Vite does not automatically copy non-VITE_* .env values into process.env,
  // so load the complete local environment before TanStack Start builds SSR/server code.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

  return {
    server: { port: 3000 },
    resolve: { tsconfigPaths: true },
    plugins: [
      tanstackStart(),
      tailwindcss(),
      // TanStack Start must be registered before the React plugin.
      viteReact(),
    ],
  };
});
