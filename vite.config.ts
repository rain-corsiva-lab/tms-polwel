import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on mode (local, staging, production)
  const env = loadEnv(mode, process.cwd(), '');
  
  console.log(`🔧 Building for mode: ${mode}`);
  console.log(`🌐 API URL: ${env.VITE_API_URL || 'NOT SET'}`);
  
  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === 'development' &&
      componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Ensure environment variables are available during build
    define: {
      __APP_ENV__: JSON.stringify(mode),
    },
  }
});
