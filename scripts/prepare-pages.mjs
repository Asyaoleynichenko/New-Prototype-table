import { cpSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const target = process.argv[2]
const root404 = process.argv.includes('--root-404')

if (!target || !['dist', 'docs'].includes(target)) {
  console.error('Usage: node scripts/prepare-pages.mjs <dist|docs> [--root-404]')
  process.exit(1)
}

const root = process.cwd()
const distDir = path.join(root, 'dist')
const outDir = path.join(root, target)

if (target === 'docs') {
  if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true })
  mkdirSync(outDir, { recursive: true })
  cpSync(distDir, outDir, { recursive: true })
}

const indexPath = path.join(outDir, 'index.html')
const html = readFileSync(indexPath, 'utf8')

// SPA fallbacks for GitHub Pages path routes like /paid
writeFileSync(path.join(outDir, '404.html'), html)
mkdirSync(path.join(outDir, 'paid'), { recursive: true })
writeFileSync(path.join(outDir, 'paid', 'index.html'), html)
mkdirSync(path.join(outDir, 'free'), { recursive: true })
writeFileSync(path.join(outDir, 'free', 'index.html'), html)

if (root404) {
  // When Pages publishes the whole repo from main/, unknown paths use root 404.html
  writeFileSync(path.join(root, '404.html'), html)
}

console.log(`Prepared SPA routes in ${target}/ (404.html, paid/, free/)${root404 ? ' + root 404.html' : ''}`)
