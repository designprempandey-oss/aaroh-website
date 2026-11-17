import { defineConfig } from 'vite'

// GitHub Pages serves this repo at /aaroh-website/. Set BASE_PATH=/ when
// deploying to a custom domain or another host that serves from the root.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/aaroh-website/',
})
