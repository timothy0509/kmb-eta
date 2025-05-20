import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const config = {
    plugins: [react()],
    base: '/', // Default for development and custom domains
  }

  if (command === 'build') {
    // Set base path for GitHub Pages deployment
    // Replace 'kmb-eta-app' with your repository name
    config.base = '/kmb-eta-app/'
  }

  return config
})
