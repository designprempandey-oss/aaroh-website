import { defineConfig } from 'vite'

// GitHub Pages serves this repo at /aaroh-website/, so production builds use that
// base. Set BASE_PATH=/ when deploying to a custom domain or another host that
// serves from the root. The dev server always runs at /.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? (process.env.BASE_PATH ?? '/aaroh-website/') : '/',
}))
