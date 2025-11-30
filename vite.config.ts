import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['secrets.js-grempe']
  },
  resolve: {
    alias: {
      'secrets.js-grempe': 'secrets.js-grempe/secrets.js'
    }
  }
})
