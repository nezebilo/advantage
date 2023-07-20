import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  server:{
    proxy:{
      '/main':'http://127.0.0.1:8000'
    }
  },
  plugins: [react()],
  optimizeDeps: {
    exclude: ['js-big-decimal']
  }
})
