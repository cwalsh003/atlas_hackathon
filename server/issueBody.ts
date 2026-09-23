import type { Lane } from './validateRequest.ts'

const TITLE_PROMPT_LENGTH = 72

export function buildTitle(regionId: string, prompt: string): string {
  const oneLine = prompt.replace(/\s+/g, ' ').trim()
  const cut =
    oneLine.length > TITLE_PROMPT_LENGTH
      ? `${oneLine.slice(0, TITLE_PROMPT_LENGTH)}…`
      : oneLine
  return `${regionId}: ${cut}`
}

export function buildBody(request: {
  prompt: string
  regionId: string
  sourceFile: string
  markup: string
  requester: string
  lane: Lane
}): string {
  const longestRun = Math.max(
    0,
    ...(request.markup.match(/`+/g) ?? []).map((run) => run.length),
  )
  const fence = '`'.repeat(Math.max(3, longestRun + 1))
  return [
    '## Prompt',
    '',
    request.prompt,
    '',
    '## Region',
    '',
    `\`${request.regionId}\``,
    '',
    '## Source file hint',
    '',
    request.sourceFile,
    '',
    '## Region markup',
    '',
    `${fence}html`,
    request.markup,
    fence,
    '',
    '## Requester',
    '',
    request.requester,
    '',
    '## Lane',
    '',
    request.lane,
    '',
  ].join('\n')
}
