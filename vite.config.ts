import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: { setupFiles: ['src/test-setup.ts'] },
  server: {
    proxy: {
      // 기본은 dev 백엔드. 로컬 gateway 로 붙으려면 API_TARGET=http://localhost:8080 npm run dev
      '/api': {
        target: process.env.API_TARGET ?? 'https://api.factoryflow.shop',
        changeOrigin: true,
        // 브라우저가 붙인 Origin(localhost:5173)을 빼서 gateway CORS 검사를 받지 않게 한다 (같은 주소처럼)
        configure: (proxy) => proxy.on('proxyReq', (req) => req.removeHeader('origin')),
      },
    },
  },
})
