# Aaroh Website

The Aaroh landing page. It started as a code copy of the Framer project "My Portfolio Site" (prempandey.com). It is plain HTML, CSS and JS, built with Vite. Motion handles the springs, and a small WebGL runtime draws the shaders.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static output in dist/, served from / (Vercel, Netlify, custom domains)
BASE_PATH=/aaroh-website/ npm run build   # GitHub Pages build (the workflow sets this)
```

## Structure

```
index.html                 all sections (nav, hero, problems, process, testimonials, pricing, FAQ, CTA, footer)
src/styles.css             tokens, fonts, layout; breakpoints: desktop ≥1200, tablet 810–1199, phone <810
src/main.js                appear animations, tickers, hovers, problem cards, process 2/3 sequences, FAQ, mobile menu
src/shaders.js             WebGL2 runtime for the Framer shaders
src/shaders/*.glsl         Wave Gradient (button + pricing) and Liquid Gradient (CTA), the original GLSL
public/assets/images|svg|fonts   every asset, downloaded locally (nothing loads from Framer's CDN)
```

## Where values came from

- Layout, colors and type come from the published Framer bundle's CSS and computed styles. At 1440, 810 and 390 px, every section's offset and height matches the original to within 1px.
- Springs: Framer's defaults (`duration 0.4, bounce 0.2`), and `0.5` for the problem cards.
- Tickers use the original speeds. The hero images run at 150px/s, slow to 70% on hover and can be dragged. The logo strip runs at 50px/s and slows to 50% on hover. The testimonials run at 150px/s, slow to 50% on hover and can be dragged.
- Process 3 is a 10-step hover sequence, 400ms per step, using the positions from the original variant CSS.

## Aaroh branding (done so far)

- The Aaroh wordmark (traced to SVG from `Aaroh Logo.png`, orange A + dark "aroh") replaces the heart + "Prem Pandey" in the navbar and footer. On hover the A-mark tilts and pops, using the old heart's spring.
- Favicon and apple-touch icon come from the Aaroh app icon. The page title, footer credit and copyright now say Aaroh.
- Still Prem's: the testimonials (they're real quotes about Prem), the OG share image, and the cal.com, Figma, email and social links.

## Differences from Framer

- The hero subtitle uses the canvas copy ("…first version in 24 hours."). The published site has a typo ("…first version inthis is nice").
- Process 2 and 3: if you leave the card mid-animation, it now resets when the sequence ends. In Framer it stayed stuck until you hovered again.
