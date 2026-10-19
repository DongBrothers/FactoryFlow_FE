import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 로컬 gateway (백엔드 services/gateway application-local.yml)
  server: { proxy: { '/api': 'http://localhost:8080' } },
})
