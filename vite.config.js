import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: 'public/popup.html',
        background: 'src/background/background.js',
        content: 'src/content/content.js',
      },
      output: {
        // Output JS files directly into the dist folder
        entryFileNames: '[name].js',
        // Output assets like CSS into an assets folder
        assetFileNames: 'assets/[name].[ext]',
        // Chunks for code splitting
        chunkFileNames: 'chunks/[name].js',
      },
    },
  },
});
