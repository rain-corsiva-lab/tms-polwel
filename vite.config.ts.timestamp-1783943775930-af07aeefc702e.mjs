// vite.config.ts
import { defineConfig, loadEnv } from "file:///C:/laragon/www/polwel/node_modules/vite/dist/node/index.js";
import react from "file:///C:/laragon/www/polwel/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///C:/laragon/www/polwel/node_modules/lovable-tagger/dist/index.js";
import fs from "fs";
var __vite_injected_original_dirname = "C:\\laragon\\www\\polwel";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  console.log(`\u{1F527} Building for mode: ${mode}`);
  console.log(`\u{1F310} API URL: ${env.VITE_API_URL || "NOT SET"}`);
  const copyHtaccessPlugin = {
    name: "copy-htaccess",
    writeBundle() {
      const sourcePath = path.resolve(__vite_injected_original_dirname, "htaccess");
      const destPath = path.resolve(__vite_injected_original_dirname, "dist", ".htaccess");
      try {
        fs.copyFileSync(sourcePath, destPath);
        console.log("\u2705 htaccess file copied to dist/.htaccess");
      } catch (error) {
        console.warn("\u26A0\uFE0F Failed to copy htaccess file:", error);
      }
    }
  };
  return {
    server: {
      host: "0.0.0.0",
      port: 8080,
      strictPort: false,
      hmr: {
        host: "localhost",
        port: 8080
      },
      proxy: {
        "/api": {
          target: "http://localhost:3001",
          changeOrigin: true,
          rewrite: (path2) => path2.replace(/^\/api/, "/api")
        }
      }
    },
    optimizeDeps: {
      exclude: ["@casl/ability"]
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      copyHtaccessPlugin
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src")
      }
    },
    // Ensure environment variables are available during build
    define: {
      __APP_ENV__: JSON.stringify(mode)
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxsYXJhZ29uXFxcXHd3d1xcXFxwb2x3ZWxcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXGxhcmFnb25cXFxcd3d3XFxcXHBvbHdlbFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovbGFyYWdvbi93d3cvcG9sd2VsL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XHJcbmltcG9ydCBmcyBmcm9tIFwiZnNcIjtcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcclxuICAvLyBMb2FkIGVudmlyb25tZW50IHZhcmlhYmxlcyBiYXNlZCBvbiBtb2RlIChsb2NhbCwgc3RhZ2luZywgcHJvZHVjdGlvbilcclxuICBjb25zdCBlbnYgPSBsb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCksICcnKTtcclxuICBcclxuICBjb25zb2xlLmxvZyhgXHVEODNEXHVERDI3IEJ1aWxkaW5nIGZvciBtb2RlOiAke21vZGV9YCk7XHJcbiAgY29uc29sZS5sb2coYFx1RDgzQ1x1REYxMCBBUEkgVVJMOiAke2Vudi5WSVRFX0FQSV9VUkwgfHwgJ05PVCBTRVQnfWApO1xyXG4gIFxyXG4gIC8vIEN1c3RvbSBwbHVnaW4gdG8gY29weSBodGFjY2VzcyBmaWxlXHJcbiAgY29uc3QgY29weUh0YWNjZXNzUGx1Z2luID0ge1xyXG4gICAgbmFtZTogJ2NvcHktaHRhY2Nlc3MnLFxyXG4gICAgd3JpdGVCdW5kbGUoKSB7XHJcbiAgICAgIGNvbnN0IHNvdXJjZVBhdGggPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnaHRhY2Nlc3MnKTtcclxuICAgICAgY29uc3QgZGVzdFBhdGggPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnZGlzdCcsICcuaHRhY2Nlc3MnKTtcclxuICAgICAgXHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgZnMuY29weUZpbGVTeW5jKHNvdXJjZVBhdGgsIGRlc3RQYXRoKTtcclxuICAgICAgICBjb25zb2xlLmxvZygnXHUyNzA1IGh0YWNjZXNzIGZpbGUgY29waWVkIHRvIGRpc3QvLmh0YWNjZXNzJyk7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKCdcdTI2QTBcdUZFMEYgRmFpbGVkIHRvIGNvcHkgaHRhY2Nlc3MgZmlsZTonLCBlcnJvcik7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9O1xyXG4gIFxyXG4gIHJldHVybiB7XHJcbiAgICBzZXJ2ZXI6IHtcclxuICAgICAgaG9zdDogJzAuMC4wLjAnLFxyXG4gICAgICBwb3J0OiA4MDgwLFxyXG4gICAgICBzdHJpY3RQb3J0OiBmYWxzZSxcclxuICAgICAgaG1yOiB7XHJcbiAgICAgICAgaG9zdDogJ2xvY2FsaG9zdCcsXHJcbiAgICAgICAgcG9ydDogODA4MCxcclxuICAgICAgfSxcclxuICAgICAgcHJveHk6IHtcclxuICAgICAgICAnL2FwaSc6IHtcclxuICAgICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMScsXHJcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpLywgJy9hcGknKSxcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBvcHRpbWl6ZURlcHM6IHtcclxuICAgICAgZXhjbHVkZTogWydAY2FzbC9hYmlsaXR5J10sXHJcbiAgICB9LFxyXG4gICAgcGx1Z2luczogW1xyXG4gICAgICByZWFjdCgpLFxyXG4gICAgICBtb2RlID09PSAnZGV2ZWxvcG1lbnQnICYmXHJcbiAgICAgIGNvbXBvbmVudFRhZ2dlcigpLFxyXG4gICAgICBjb3B5SHRhY2Nlc3NQbHVnaW4sXHJcbiAgICBdLmZpbHRlcihCb29sZWFuKSxcclxuICAgIHJlc29sdmU6IHtcclxuICAgICAgYWxpYXM6IHtcclxuICAgICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgICAvLyBFbnN1cmUgZW52aXJvbm1lbnQgdmFyaWFibGVzIGFyZSBhdmFpbGFibGUgZHVyaW5nIGJ1aWxkXHJcbiAgICBkZWZpbmU6IHtcclxuICAgICAgX19BUFBfRU5WX186IEpTT04uc3RyaW5naWZ5KG1vZGUpLFxyXG4gICAgfSxcclxuICB9XHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlQLFNBQVMsY0FBYyxlQUFlO0FBQy9SLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyx1QkFBdUI7QUFDaEMsT0FBTyxRQUFRO0FBSmYsSUFBTSxtQ0FBbUM7QUFPekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFFeEMsUUFBTSxNQUFNLFFBQVEsTUFBTSxRQUFRLElBQUksR0FBRyxFQUFFO0FBRTNDLFVBQVEsSUFBSSxnQ0FBeUIsSUFBSSxFQUFFO0FBQzNDLFVBQVEsSUFBSSxzQkFBZSxJQUFJLGdCQUFnQixTQUFTLEVBQUU7QUFHMUQsUUFBTSxxQkFBcUI7QUFBQSxJQUN6QixNQUFNO0FBQUEsSUFDTixjQUFjO0FBQ1osWUFBTSxhQUFhLEtBQUssUUFBUSxrQ0FBVyxVQUFVO0FBQ3JELFlBQU0sV0FBVyxLQUFLLFFBQVEsa0NBQVcsUUFBUSxXQUFXO0FBRTVELFVBQUk7QUFDRixXQUFHLGFBQWEsWUFBWSxRQUFRO0FBQ3BDLGdCQUFRLElBQUksK0NBQTBDO0FBQUEsTUFDeEQsU0FBUyxPQUFPO0FBQ2QsZ0JBQVEsS0FBSyw4Q0FBb0MsS0FBSztBQUFBLE1BQ3hEO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFFQSxTQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixZQUFZO0FBQUEsTUFDWixLQUFLO0FBQUEsUUFDSCxNQUFNO0FBQUEsUUFDTixNQUFNO0FBQUEsTUFDUjtBQUFBLE1BQ0EsT0FBTztBQUFBLFFBQ0wsUUFBUTtBQUFBLFVBQ04sUUFBUTtBQUFBLFVBQ1IsY0FBYztBQUFBLFVBQ2QsU0FBUyxDQUFDQSxVQUFTQSxNQUFLLFFBQVEsVUFBVSxNQUFNO0FBQUEsUUFDbEQ7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0EsY0FBYztBQUFBLE1BQ1osU0FBUyxDQUFDLGVBQWU7QUFBQSxJQUMzQjtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sU0FBUyxpQkFDVCxnQkFBZ0I7QUFBQSxNQUNoQjtBQUFBLElBQ0YsRUFBRSxPQUFPLE9BQU87QUFBQSxJQUNoQixTQUFTO0FBQUEsTUFDUCxPQUFPO0FBQUEsUUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsTUFDdEM7QUFBQSxJQUNGO0FBQUE7QUFBQSxJQUVBLFFBQVE7QUFBQSxNQUNOLGFBQWEsS0FBSyxVQUFVLElBQUk7QUFBQSxJQUNsQztBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogWyJwYXRoIl0KfQo=
