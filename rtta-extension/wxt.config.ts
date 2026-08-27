import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  manifestVersion: 3,
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "RTTA",
    description: "Real-Time Translation AI for Chrome.",
    minimum_chrome_version: "116",
    permissions: ["activeTab", "offscreen", "storage", "tabCapture"],
    icons: {
      16: "icon/16.png",
      32: "icon/32.png",
      48: "icon/48.png",
      128: "icon/128.png",
    },
    action: {
      default_icon: {
        16: "icon/16.png",
        32: "icon/32.png",
        48: "icon/48.png",
        128: "icon/128.png",
      },
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
