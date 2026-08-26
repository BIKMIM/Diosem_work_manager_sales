import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // 두 GitHub Pages 저장소 경로에서 동일한 결과물을 사용할 수 있게 한다.
  base: './',
  resolve: {
    alias: {
      '@variant': fileURLToPath(new URL(
        `./src/variants/${mode === 'tech' ? 'tech' : 'sales'}.jsx`,
        import.meta.url
      )),
    },
  },
}))
