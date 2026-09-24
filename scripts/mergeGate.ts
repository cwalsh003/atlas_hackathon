import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/**
 * One file changed by a request's PR. `addedLines` are 1-based line numbers in
 * `content` (the new side); `removedLines` are 1-based line numbers on the old
 * side; `content` is null when the file is deleted.
 */
export type ChangedFile = {
  path: string
  addedLines: number[]
  removedLines: number[]
  content: string | null
}

/** Where the PR comes from: only same-repository PRs by the loop's own account may pass. */
export type PrOrigin = {
  crossRepository: boolean
  author: string
  operator: string
}

export type Verdict = { pass: boolean; reasons: string[] }

function pathRule(path: string): string | null {
  if (path.startsWith('test-results/')) return null
  if (!path.startsWith('src/')) return 'outside src/'
  if (path === 'src/demoMode.ts' || path.startsWith('src/flags/')) {
    return 'protected file (flag hook or demo-mode constant)'
  }
  return null
}

/**
 * Line numbers of the CSS whose code is not inside, and does not open, a rule
 * scoped to `.req-<n>`. Every comma-separated selector must carry the class
 * outside any functional pseudo-class argument (so `:not(.req-<n>)` does not
 * count); an at-rule prelude never grants scope, it inherits the enclosing one;
 * declarations and closing braces inherit their enclosing rule. Comments and
 * string contents are blanked first so braces inside them cannot fake a scope.
 */
function unscopedCssLines(content: string, n: number): Set<number> {
  const scopedClass = new RegExp(`\\.req-${n}(?![\\w-])`)
  const scoped = (selector: string) => {
    let bare = selector
    for (let prev = ''; prev !== bare;) {
      prev = bare
      bare = bare.replace(/\([^()]*\)/g, '')
    }
    return scopedClass.test(bare)
  }
  const code = content.replace(
    /\/\*[\s\S]*?\*\/|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g,
    (m) => m.replace(/[^\n]/g, ' '),
  )
  const stack: boolean[] = []
  const bad = new Set<number>()
  let chunk = ''
  let chunkLines = new Set<number>()
  let line = 1
  const settle = (ok: boolean) => {
    if (!ok) for (const l of chunkLines) bad.add(l)
    chunk = ''
    chunkLines = new Set()
  }
  const inScope = () => stack.some(Boolean)
  for (const ch of code) {
    if (ch === '\n') {
      line++
      continue
    }
    if (ch.trim() === '') {
      chunk += ch
      continue
    }
    chunkLines.add(line)
    if (ch === '{') {
      const ok =
        inScope() ||
        (!chunk.trim().startsWith('@') && chunk.split(',').every(scoped))
      settle(ok)
      stack.push(ok)
    } else if (ch === ';' || ch === '}') {
      settle(inScope())
      if (ch === '}') stack.pop()
    } else {
      chunk += ch
    }
  }
  settle(inScope())
  return bad
}

function flagRule(file: ChangedFile, n: number): string | null {
  const { path, content } = file
  if (path.startsWith('test-results/') || /\.test\.tsx?$/.test(path))
    return null
  if (/\.tsx?$/.test(path)) {
    const call = new RegExp(`useFlag\\((['"])req-${n}\\1\\)`)
    return content !== null && call.test(content)
      ? null
      : `missing useFlag('req-${n}')`
  }
  if (path.endsWith('.css')) {
    if (content === null) return `deleted css cannot be scoped to .req-${n}`
    if (file.removedLines.length > 0) return 'css lines removed'
    const bad = unscopedCssLines(content, n)
    const line = file.addedLines.find((l) => bad.has(l))
    return line === undefined
      ? null
      : `css line ${line} not scoped to .req-${n}`
  }
  return 'file type not allowed in a small request'
}

export function gateVerdict(
  files: ChangedFile[],
  n: number,
  origin: PrOrigin,
): Verdict {
  if (origin.crossRepository || origin.author !== origin.operator) {
    return { pass: false, reasons: ['cross-repository or foreign-author PR'] }
  }
  const reasons: string[] = []
  for (const file of files) {
    const rule = pathRule(file.path) ?? flagRule(file, n)
    if (rule) reasons.push(`${file.path}: ${rule}`)
  }
  return { pass: reasons.length === 0, reasons }
}

/**
 * Added (new-side) and removed (old-side) line numbers from one file's `patch`
 * as the GitHub pull-request files API returns it: hunks only. Any other line,
 * such as a `diff --git` header, throws rather than being skipped.
 */
export function parsePatch(patch: string): {
  addedLines: number[]
  removedLines: number[]
} {
  const addedLines: number[] = []
  const removedLines: number[] = []
  let added = 0
  let removed = 0
  let inHunk = false
  const lines = patch.split('\n')
  if (lines.at(-1) === '') lines.pop()
  for (const text of lines) {
    const hunk = text.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
    if (hunk) {
      inHunk = true
      removed = Number(hunk[1])
      added = Number(hunk[2])
    } else if (inHunk && text.startsWith('+')) addedLines.push(added++)
    else if (inHunk && text.startsWith('-')) removedLines.push(removed++)
    else if (inHunk && text.startsWith(' ')) {
      added++
      removed++
    } else if (!(inHunk && text.startsWith('\\'))) {
      throw new Error(`unparseable patch line: ${text.slice(0, 80)}`)
    }
  }
  return { addedLines, removedLines }
}

/** One entry of `GET /repos/{owner}/{repo}/pulls/{pr}/files`. */
export type PrFileEntry = {
  filename: string
  status: string
  previous_filename?: string | null
  patch?: string | null
}

/**
 * The gate's file model from the pull-request files API. A rename is a
 * deletion of the old path plus a change of the new one. `contentOf` is only
 * called for source the gate inspects (non-deleted `src/**` .ts, .tsx, .css).
 */
export function changedFiles(
  entries: PrFileEntry[],
  contentOf: (path: string) => string,
): ChangedFile[] {
  const files: ChangedFile[] = []
  for (const entry of entries) {
    const path = entry.filename
    const patch = entry.patch ?? undefined // the CLI's jq writes null for absent fields
    if (entry.status === 'renamed') {
      if (!entry.previous_filename)
        throw new Error(`rename without source: ${path}`)
      files.push({
        path: entry.previous_filename,
        addedLines: [],
        removedLines: [],
        content: null,
      })
    }
    if (patch === undefined && path.endsWith('.css')) {
      throw new Error(`no patch for ${path}, cannot check its css lines`)
    }
    const lines =
      patch === undefined
        ? { addedLines: [], removedLines: [] }
        : parsePatch(patch)
    const inspected = /^src\/.*\.(tsx?|css)$/.test(path)
    files.push({
      path,
      ...lines,
      content:
        entry.status === 'removed' ? null : inspected ? contentOf(path) : '',
    })
  }
  return files
}

function gh(args: string[]): string {
  return execFileSync('gh', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
}

// CLI: node scripts/mergeGate.ts <pr> <issue>; exit 0 pass, 1 refuse, 2 could not check.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [pr, issue] = process.argv.slice(2)
  if (!/^\d+$/.test(pr ?? '') || !/^\d+$/.test(issue ?? '')) {
    console.error('usage: node scripts/mergeGate.ts <pr> <issue>')
    process.exit(2)
  }
  try {
    const head = JSON.parse(
      gh(['pr', 'view', pr, '--json', 'headRefOid,isCrossRepository,author']),
    ) as {
      headRefOid: string
      isCrossRepository: boolean
      author: { login: string }
    }
    const origin: PrOrigin = {
      crossRepository: head.isCrossRepository,
      author: head.author.login,
      operator: gh(['api', 'user', '-q', '.login']).trim(),
    }
    const trusted = !origin.crossRepository && origin.author === origin.operator
    // A fork's head commit is not in this repository, so its files are never read.
    const files = !trusted
      ? []
      : changedFiles(
          gh([
            'api',
            '--paginate',
            `repos/{owner}/{repo}/pulls/${pr}/files`,
            '--jq',
            '.[] | {filename, status, previous_filename, patch}',
          ])
            .split('\n')
            .filter(Boolean)
            .map((line) => JSON.parse(line) as PrFileEntry),
          (path) =>
            gh([
              'api',
              '-H',
              'Accept: application/vnd.github.raw+json',
              `repos/{owner}/{repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${head.headRefOid}`,
            ]),
        )
    const verdict = gateVerdict(files, Number(issue), origin)
    console.log(
      JSON.stringify({
        pr: Number(pr),
        issue: Number(issue),
        sha: head.headRefOid,
        ...verdict,
      }),
    )
    process.exit(verdict.pass ? 0 : 1)
  } catch (error) {
    console.error(
      `merge gate could not read PR ${pr}: ${(error as Error).message}`,
    )
    process.exit(2)
  }
}
