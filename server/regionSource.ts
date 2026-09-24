import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DASHBOARD_DIR = fileURLToPath(
  new URL('../src/dashboard/', import.meta.url),
)

/** The dashboard file that declares the region, or `unknown`. */
export async function sourceFileHint(regionId: string): Promise<string> {
  const files = (await readdir(DASHBOARD_DIR))
    .filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx'))
    .sort()
  for (const file of files) {
    const text = await readFile(path.join(DASHBOARD_DIR, file), 'utf8')
    if (text.includes(`id="${regionId}"`)) return `src/dashboard/${file}`
  }
  return 'unknown'
}
