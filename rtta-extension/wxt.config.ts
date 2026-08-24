import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  manifestVersion: 3,
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "RTTA",
    description: "Real-Time Translation AI for Chrome.",
    minimum_chrome_version: "116",
    permissions: ["activeTab", "offscreen", "tabCapture"],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
