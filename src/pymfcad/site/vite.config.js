import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/',
  appType: 'mpa',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        visualizer: 'visualizer/index.html'
      },
    },
  },
});
