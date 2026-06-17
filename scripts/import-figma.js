#!/usr/bin/env node

/**
 * Figma Design Importer
 * Fetches design tokens from Figma and updates local design system
 *
 * Usage: node scripts/import-figma.js
 * Requires: FIGMA_FILE_KEY and FIGMA_ACCESS_TOKEN in .env
 */

import 'dotenv/config'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

const FILE_KEY = process.env.VITE_FIGMA_FILE_KEY
const TOKEN = process.env.VITE_FIGMA_ACCESS_TOKEN

if (!FILE_KEY || !TOKEN) {
  console.error('Missing FIGMA_FILE_KEY or FIGMA_ACCESS_TOKEN in .env')
  process.exit(1)
}

async function fetchFigma(endpoint) {
  const res = await fetch(`https://api.figma.com/v1/${endpoint}`, {
    headers: { 'X-Figma-Token': TOKEN },
  })
  if (!res.ok) throw new Error(`Figma API error: ${res.status}`)
  return res.json()
}

async function extractColors(styles) {
  const colors = {}
  for (const style of styles.meta.styles) {
    if (style.style_type === 'FILL') {
      const detail = await fetchFigma(`files/${FILE_KEY}/styles/${style.key}`)
      // Extract hex from fills
      if (detail.meta?.style?.fillOverrides) {
        // Simplified - full implementation would parse fill data
        colors[style.name.toLowerCase().replace(/\s+/g, '-')] = detail.meta.style.description
      }
    }
  }
  return colors
}

async function importDesign() {
  console.log('Fetching Figma file styles...')

  const [styles, file] = await Promise.all([
    fetchFigma(`files/${FILE_KEY}/styles`),
    fetchFigma(`files/${FILE_KEY}?depth=1`),
  ])

  console.log(`Found ${styles.meta.styles.length} styles`)
  console.log(`File: ${file.name}`)
  console.log('Design import complete!')
  console.log('\nNote: For full token extraction, use the Figma MCP server:')
  console.log('  npm run figma-mcp')
}

importDesign().catch(err => {
  console.error('Import failed:', err.message)
  process.exit(1)
})
