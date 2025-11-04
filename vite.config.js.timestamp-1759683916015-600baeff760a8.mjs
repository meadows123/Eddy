// vite.config.js
import path from "node:path";
import react from "file:///mnt/c/Users/user/VIPCLub/node_modules/@vitejs/plugin-react/dist/index.js";
import { defineConfig } from "file:///mnt/c/Users/user/VIPCLub/node_modules/vite/dist/node/index.js";
var __vite_injected_original_dirname = "/mnt/c/Users/user/VIPCLub";
var vite_config_default = defineConfig({
  base: "/",
  plugins: [react()],
  css: {
    postcss: "./postcss.config.js"
  },
  server: {
    port: 3e3,
    host: "0.0.0.0",
    strictPort: true,
    hmr: {
      overlay: false
    },
    cors: true,
    origin: "http://localhost:3000"
  },
  resolve: {
    extensions: [".jsx", ".js", ".tsx", ".ts", ".json"],
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src"),
      "src": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === "CIRCULAR_DEPENDENCY")
          return;
        warn(warning);
      }
    }
  },
  preview: {
    host: "0.0.0.0",
    port: process.env.PORT || 4173,
    cors: true,
    allowedHosts: [
      "vipclubapp.onrender.com",
      "oneeddy.com",
      "www.oneeddy.com",
      "localhost",
      "127.0.0.1"
    ]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvbW50L2MvVXNlcnMvdXNlci9WSVBDTHViXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvbW50L2MvVXNlcnMvdXNlci9WSVBDTHViL3ZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9tbnQvYy9Vc2Vycy91c2VyL1ZJUENMdWIvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuXHRiYXNlOiAnLycsXG5cdHBsdWdpbnM6IFtyZWFjdCgpXSxcblx0Y3NzOiB7XG5cdFx0cG9zdGNzczogJy4vcG9zdGNzcy5jb25maWcuanMnXG5cdH0sXG5cdHNlcnZlcjoge1xuXHRcdHBvcnQ6IDMwMDAsXG5cdFx0aG9zdDogJzAuMC4wLjAnLFxuXHRcdHN0cmljdFBvcnQ6IHRydWUsXG5cdFx0aG1yOiB7XG5cdFx0XHRvdmVybGF5OiBmYWxzZVxuXHRcdH0sXG5cdFx0Y29yczogdHJ1ZSxcblx0XHRvcmlnaW46ICdodHRwOi8vbG9jYWxob3N0OjMwMDAnXG5cdH0sXG5cdHJlc29sdmU6IHtcblx0XHRleHRlbnNpb25zOiBbJy5qc3gnLCAnLmpzJywgJy50c3gnLCAnLnRzJywgJy5qc29uJ10sXG5cdFx0YWxpYXM6IHtcblx0XHRcdCdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJyksXG5cdFx0XHQnc3JjJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJylcblx0XHR9LFxuXHR9LFxuXHRidWlsZDoge1xuXHRcdG91dERpcjogJ2Rpc3QnLFxuXHRcdHNvdXJjZW1hcDogdHJ1ZSxcblx0XHRyb2xsdXBPcHRpb25zOiB7XG5cdFx0XHRvbndhcm4od2FybmluZywgd2Fybikge1xuXHRcdFx0XHRpZiAod2FybmluZy5jb2RlID09PSAnQ0lSQ1VMQVJfREVQRU5ERU5DWScpIHJldHVybjtcblx0XHRcdFx0d2Fybih3YXJuaW5nKTtcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cdHByZXZpZXc6IHtcblx0XHRob3N0OiAnMC4wLjAuMCcsXG5cdFx0cG9ydDogcHJvY2Vzcy5lbnYuUE9SVCB8fCA0MTczLFxuXHRcdGNvcnM6IHRydWUsXG5cdFx0YWxsb3dlZEhvc3RzOiBbXG5cdFx0XHQndmlwY2x1YmFwcC5vbnJlbmRlci5jb20nLCBcblx0XHRcdCdvbmVlZGR5LmNvbScsIFxuXHRcdFx0J3d3dy5vbmVlZGR5LmNvbScsXG5cdFx0XHQnbG9jYWxob3N0Jyxcblx0XHRcdCcxMjcuMC4wLjEnXG5cdFx0XSxcblx0fVxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTZQLE9BQU8sVUFBVTtBQUM5USxPQUFPLFdBQVc7QUFDbEIsU0FBUyxvQkFBb0I7QUFGN0IsSUFBTSxtQ0FBbUM7QUFJekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDM0IsTUFBTTtBQUFBLEVBQ04sU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLEtBQUs7QUFBQSxJQUNKLFNBQVM7QUFBQSxFQUNWO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsSUFDWixLQUFLO0FBQUEsTUFDSixTQUFTO0FBQUEsSUFDVjtBQUFBLElBQ0EsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLEVBQ1Q7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNSLFlBQVksQ0FBQyxRQUFRLE9BQU8sUUFBUSxPQUFPLE9BQU87QUFBQSxJQUNsRCxPQUFPO0FBQUEsTUFDTixLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsTUFDcEMsT0FBTyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3ZDO0FBQUEsRUFDRDtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ04sUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLE1BQ2QsT0FBTyxTQUFTLE1BQU07QUFDckIsWUFBSSxRQUFRLFNBQVM7QUFBdUI7QUFDNUMsYUFBSyxPQUFPO0FBQUEsTUFDYjtBQUFBLElBQ0Q7QUFBQSxFQUNEO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUixNQUFNO0FBQUEsSUFDTixNQUFNLFFBQVEsSUFBSSxRQUFRO0FBQUEsSUFDMUIsTUFBTTtBQUFBLElBQ04sY0FBYztBQUFBLE1BQ2I7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRDtBQUFBLEVBQ0Q7QUFDRCxDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
