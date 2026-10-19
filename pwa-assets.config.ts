import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// `npx pwa-assets-generator` → PNG icons in public/ from the app icon SVG
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    // Full-bleed blue background so iOS doesn't add a white border
    apple: { sizes: [180], padding: 0 },
    maskable: { sizes: [512], padding: 0 },
  },
  images: ['public/app-icon.svg'],
})
