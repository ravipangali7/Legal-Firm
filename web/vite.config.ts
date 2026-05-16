import http from "node:http";
import path from "path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import { componentTagger } from "lovable-tagger";

/**
 * Dev-only: `GET /professionals` with `Accept: application/json` returns the same JSON as
 * Django `GET /api/public/professionals/` so the SPA can use `http://localhost:8080/professionals`
 * as the data URL without colliding with HTML navigations (those send `text/html` in Accept).
 */
function professionalsJsonProxy(): Plugin {
  return {
    name: "professionals-json-proxy",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method !== "GET") {
          next();
          return;
        }
        const pathname = req.url?.split("?")[0] ?? "";
        if (pathname !== "/professionals") {
          next();
          return;
        }
        const accept = req.headers.accept ?? "";
        if (!accept.includes("application/json")) {
          next();
          return;
        }
        const proxyReq = http.request(
          {
            hostname: "https://legalfirmserver.360winx.com",
            port: 443,
            path: "/api/public/professionals/",
            method: "GET",
            headers: { Accept: "application/json" },
          },
          (proxyRes) => {
            res.statusCode = proxyRes.statusCode ?? 502;
            const ct = proxyRes.headers["content-type"];
            if (ct) res.setHeader("Content-Type", ct);
            proxyRes.pipe(res);
          },
        );
        proxyReq.on("error", () => {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              detail: "Professionals API unreachable (is Django running on :8000?).",
            }),
          );
        });
        proxyReq.end();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "https://legalfirmserver.360winx.com",
        changeOrigin: true,
      },
      "/media": {
        target: "https://legalfirmserver.360winx.com",
        changeOrigin: true,
      },
      "/sitemap.xml": {
        target: "https://legalfirmserver.360winx.com",
        changeOrigin: true,
        rewrite: (path) => "/api/public/sitemap.xml",
      },
      "/robots.txt": {
        target: "https://legalfirmserver.360winx.com",
        changeOrigin: true,
        rewrite: (path) => "/api/public/robots.txt",
      },
    },
  },
  plugins: [
    mode === "development" && professionalsJsonProxy(),
    react(),
    mode === "development" &&
      command === "serve" &&
      componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
}));
