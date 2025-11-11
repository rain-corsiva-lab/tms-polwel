import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on mode (local, staging, production)
  const env = loadEnv(mode, process.cwd(), '');
  
  console.log(`🔧 Building for mode: ${mode}`);
  console.log(`🌐 API URL: ${env.VITE_API_URL || 'NOT SET'}`);
  
  // Custom plugin to copy htaccess file
  const copyHtaccessPlugin = {
    name: 'copy-htaccess',
    writeBundle() {
      const sourcePath = path.resolve(__dirname, 'htaccess');
      const destPath = path.resolve(__dirname, 'dist', '.htaccess');
      
      try {
        fs.copyFileSync(sourcePath, destPath);
        console.log('✅ htaccess file copied to dist/.htaccess');
      } catch (error) {
        console.warn('⚠️ Failed to copy htaccess file:', error);
      }
    }
  };
  
  return {
    server: {
      host: '0.0.0.0',
      port: 8080,
      strictPort: true,
      hmr: {
        host: 'localhost',
        port: 8080,
      },
    },
    plugins: [
      react(),
      mode === 'development' &&
      componentTagger(),
      copyHtaccessPlugin,
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
