import { defineConfig } from "wxt";

export default defineConfig({
  vite: () => ({ oxc: { jsx: { runtime: "automatic", importSource: "preact" } } }),
  manifest: {
    name: "UnsubSweep",
    version: "2.0.0",
    permissions: ["identity", "storage", "sidePanel"],
    oauth2: {
      client_id:
        process.env.WXT_GOOGLE_CLIENT_ID ?? "REPLACE_WITH_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com",
      scopes: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
      ],
    },
    action: { default_title: "UnsubSweep" },
    side_panel: { default_path: "sidepanel.html" },
  },
});
