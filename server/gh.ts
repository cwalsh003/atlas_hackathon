import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

/** Runs `gh` with an argument array (never a shell) and a 30 s timeout. */
export function gh(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('gh', args, { timeout: 30_000 }, (error, stdout, stderr) => {
      if (error) reject(new Error(String(stderr).trim() || error.message))
      else resolve(String(stdout))
    })
  })
}

/** Runs `gh` with `body` passed through a temporary `--body-file`. */
export async function ghWithBody(
  args: string[],
  body: string,
): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'asd-gh-'))
  const bodyFile = path.join(dir, 'body.md')
  try {
    await writeFile(bodyFile, body)
    return await gh([...args, '--body-file', bodyFile])
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}
