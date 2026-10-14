import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Any request to /api/... is forwarded to the FastAPI back end on port 8000.
    // This means the front end never needs to know the back end's address.
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
