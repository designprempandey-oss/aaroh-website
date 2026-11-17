import { defineConfig } from 'vite'

// Builds serve from the root by default (Vercel, Netlify, custom domains).
// The GitHub Pages workflow sets BASE_PATH=/aaroh-website/ because Pages serves
// the repo under that sub-path.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
})
