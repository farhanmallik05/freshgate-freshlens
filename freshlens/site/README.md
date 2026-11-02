# FreshLens Landing Site & Demo Playground

This directory contains the production landing page, interactive playground, and deterministic `/demo-chat` interface for **FreshLens**.

## 1. Local Development
```bash
pnpm install
pnpm dev
# Site opens at http://localhost:5173
```

## 2. Production Build
```bash
pnpm build
# Emits optimized static distribution to dist/
```

## 3. Free Deployment Guides

### Option A: Vercel (Recommended)
1. Install Vercel CLI: `npm i -g vercel`
2. Run in `site/`:
   ```bash
   vercel --prod
   ```
3. Set Framework to **Vite** and root directory to `freshlens/site`.

### Option B: Netlify
1. Connect repository or run `netlify deploy --prod --dir=dist`.
2. Build command: `pnpm build`.
3. Publish directory: `dist`.

### Option C: GitHub Pages
1. Build site: `pnpm build`.
2. Push contents of `dist/` to a `gh-pages` branch.
