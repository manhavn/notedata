import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'firebase',
              test: /node_modules\/firebase/,
            },
            {
              name: 'markdown',
              test: /node_modules\/(marked|dompurify)/,
            },
          ],
        },
      },
    },
  },
})