import { describe, expect, it } from 'vitest'
import {
  changedFiles,
  gateVerdict,
  parsePatch,
  type ChangedFile,
} from './mergeGate.ts'

const ownPr = {
  crossRepository: false,
  author: 'loop-bot',
  operator: 'loop-bot',
}

type Fixture = Omit<ChangedFile, 'removedLines'> & { removedLines?: number[] }
const check = (files: Fixture[], n = 42) =>
  gateVerdict(
    files.map((file) => ({ removedLines: [], ...file })),
    n,
    ownPr,
  )

const flaggedKpi = `import { useFlag } from '../flags/useFlag.ts'
export function KpiCards() {
  const on = useFlag('req-42')
  return <span>{on ? 'Snowed in' : 'Buried'}</span>
}
`

describe('gateVerdict', () => {
  it('passes a flagged change to a dashboard file', () => {
    expect(
      check(
        [
          {
            path: 'src/dashboard/KpiCards.tsx',
            addedLines: [3],
            content: flaggedKpi,
          },
        ],
        42,
      ),
    ).toEqual({ pass: true, reasons: [] })
  })

  it('refuses a change outside src/', () => {
    const verdict = check(
      [
        {
          path: 'package.json',
          addedLines: [3],
          content: '{\n  "scripts": {\n    "hi": "echo hi"\n  }\n}\n',
        },
      ],
      42,
    )
    expect(verdict.pass).toBe(false)
    expect(verdict.reasons).toEqual(['package.json: outside src/'])
  })

  it.each([
    'src/flags/useFlag.ts',
    'src/demoMode.ts',
    'src/flags/flagStore.ts',
  ])('refuses an edit to the protected file %s', (path) => {
    const verdict = check(
      [{ path, addedLines: [1], content: "useFlag('req-42')\n" }],
      42,
    )
    expect(verdict.pass).toBe(false)
    expect(verdict.reasons).toHaveLength(1)
    expect(verdict.reasons[0]).toMatch(new RegExp(`^${path}: `))
  })

  it('refuses a change under server/', () => {
    expect(
      check([
        {
          path: 'server/api/requests.ts',
          addedLines: [1],
          content: "useFlag('req-42')\n",
        },
      ]).reasons,
    ).toEqual(['server/api/requests.ts: outside src/'])
  })

  it('refuses a PR from a fork', () => {
    expect(gateVerdict([], 42, { ...ownPr, crossRepository: true })).toEqual({
      pass: false,
      reasons: ['cross-repository or foreign-author PR'],
    })
  })

  it('refuses a PR opened by an account other than the loop operator', () => {
    expect(gateVerdict([], 42, { ...ownPr, author: 'stranger' })).toEqual({
      pass: false,
      reasons: ['cross-repository or foreign-author PR'],
    })
  })

  it('refuses an unflagged change to a dashboard file', () => {
    const verdict = check(
      [
        {
          path: 'src/dashboard/Footer.tsx',
          addedLines: [5],
          content: `import { Region } from './Region'

export function Footer() {
  return (
    <Region id="footer" as="footer" className="footer">Built by yetis</Region>
  )
}
`,
        },
      ],
      42,
    )
    expect(verdict).toEqual({
      pass: false,
      reasons: ["src/dashboard/Footer.tsx: missing useFlag('req-42')"],
    })
  })

  it("refuses a change flagged for another request's issue", () => {
    const verdict = check(
      [
        {
          path: 'src/dashboard/KpiCards.tsx',
          addedLines: [3],
          content: flaggedKpi.replace("'req-42'", "'req-421'"),
        },
      ],
      42,
    )
    expect(verdict.pass).toBe(false)
  })

  it('refuses deleting a source file, which cannot carry the flag', () => {
    const verdict = check(
      [{ path: 'src/dashboard/Footer.tsx', addedLines: [], content: null }],
      42,
    )
    expect(verdict.pass).toBe(false)
  })

  it('refuses source file types the gate cannot check for the flag', () => {
    const verdict = check(
      [
        {
          path: 'src/dashboard/Footer.jsx',
          addedLines: [1],
          content: 'export const x = 1\n',
        },
      ],
      42,
    )
    expect(verdict.pass).toBe(false)
  })

  it('exempts test files and test-results from the flag check', () => {
    expect(
      check(
        [
          {
            path: 'src/dashboard/KpiCards.test.tsx',
            addedLines: [1],
            content: "it('renames', () => {})\n",
          },
          {
            path: 'test-results/req-42/after.png',
            addedLines: [],
            content: 'binary',
          },
          {
            path: 'src/dashboard/KpiCards.tsx',
            addedLines: [3],
            content: flaggedKpi,
          },
        ],
        42,
      ),
    ).toEqual({ pass: true, reasons: [] })
  })

  describe('css', () => {
    const css = `.kpi-card {
  padding: 1rem;
  color: black;
}

.req-42 .kpi-card__label,
.kpi-card.req-42 {
  color: red;
}
`
    const cssFile = (
      addedLines: number[],
      content = css,
      removedLines: number[] = [],
    ) => [{ path: 'src/index.css', addedLines, removedLines, content }]

    it('passes a new rule scoped to the request class', () => {
      expect(check(cssFile([5, 6, 7, 8, 9]), 42)).toEqual({
        pass: true,
        reasons: [],
      })
    })

    it('refuses a declaration added to an unscoped rule', () => {
      expect(check(cssFile([3]), 42)).toEqual({
        pass: false,
        reasons: ['src/index.css: css line 3 not scoped to .req-42'],
      })
    })

    it('refuses a new rule without the request class', () => {
      const unscoped = `${css}\n.kpi-card__value {\n  color: red;\n}\n`
      expect(check(cssFile([11, 12, 13], unscoped), 42).pass).toBe(false)
    })

    it('refuses a selector list where one selector lacks the request class', () => {
      const mixed = css.replace('.kpi-card.req-42 {', '.kpi-card {')
      expect(check(cssFile([6, 7, 8, 9], mixed), 42).pass).toBe(false)
    })

    it('refuses an unscoped rule hidden behind a scoped selector in a comment', () => {
      const tricked = `${css}/* .req-42 .x { */ .evil { color: red; } /* } */\n`
      expect(check(cssFile([10], tricked), 42).pass).toBe(false)
    })

    it('refuses a selector that only names the class inside :not()', () => {
      const negated = `${css}:root:not(.req-42) {\n  color: red;\n}\n`
      expect(check(cssFile([10, 11, 12], negated), 42).pass).toBe(false)
    })

    it('refuses an at-rule whose prelude names the class around an unscoped rule', () => {
      const supports = `${css}@supports selector(.req-42) {\n  body {\n    color: red;\n  }\n}\n`
      expect(check(cssFile([10, 11, 12, 13, 14], supports), 42).pass).toBe(
        false,
      )
    })

    it('refuses removing css lines, even without adding any', () => {
      expect(check(cssFile([], css, [2]), 42)).toEqual({
        pass: false,
        reasons: ['src/index.css: css lines removed'],
      })
    })

    it("refuses a rule scoped to another request's class", () => {
      const other = css.replaceAll('req-42', 'req-421')
      expect(check(cssFile([6, 7, 8, 9], other), 42).pass).toBe(false)
    })
  })
})

describe('parsePatch', () => {
  it("reads added and removed line numbers from one file's patch", () => {
    const patch = `@@ -1,4 +1,5 @@
 import { kpis } from '../mockData'
+import { useFlag } from '../flags/useFlag'
 import { Region } from './Region'
-const a = 1
+++counter
 const b = 2
\\ No newline at end of file`
    expect(parsePatch(patch)).toEqual({ addedLines: [2, 4], removedLines: [3] })
  })

  it('throws on a diff header, such as a quoted path, instead of dropping the file', () => {
    const patch = `diff --git "a/src/we\\tird.tsx" "b/src/we\\tird.tsx"
@@ -1 +1 @@
-a
+b`
    expect(() => parsePatch(patch)).toThrow()
  })
})

describe('changedFiles', () => {
  const noContent = () => ''

  it('treats a rename away from vite.config.ts as deleting it, so the gate refuses', () => {
    const files = changedFiles(
      [
        {
          filename: 'src/vite.config.ts',
          status: 'renamed',
          previous_filename: 'vite.config.ts',
        },
      ],
      () => "useFlag('req-42')\n",
    )
    expect(files).toContainEqual({
      path: 'vite.config.ts',
      addedLines: [],
      removedLines: [],
      content: null,
    })
    expect(gateVerdict(files, 42, ownPr).reasons).toContain(
      'vite.config.ts: outside src/',
    )
  })

  it('gives a removed file no content, so a removed source file is refused', () => {
    const files = changedFiles(
      [
        {
          filename: 'src/dashboard/Footer.tsx',
          status: 'removed',
          patch: '@@ -1 +0,0 @@\n-x',
        },
      ],
      noContent,
    )
    expect(files).toEqual([
      {
        path: 'src/dashboard/Footer.tsx',
        addedLines: [],
        removedLines: [1],
        content: null,
      },
    ])
  })

  it('refuses to guess the lines of a css file whose patch GitHub omitted', () => {
    expect(() =>
      changedFiles(
        [{ filename: 'src/index.css', status: 'modified' }],
        noContent,
      ),
    ).toThrow()
  })
})
