import { readFile, writeFile } from 'node:fs/promises'

/** Voters per proposal, keyed by the proposal's issue number. */
export type Votes = Record<string, string[]>

export async function readVotes(file: string): Promise<Votes> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as Votes
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw error
  }
}

/** Records one vote per voter per proposal and returns that proposal's voters. */
// ponytail: unlocked read-modify-write; a lost vote under a same-millisecond race is fine for a demo.
export async function addVote(
  file: string,
  number: number,
  voter: string,
): Promise<string[]> {
  const votes = await readVotes(file)
  const voters = votes[number] ?? []
  if (!voters.includes(voter)) {
    votes[number] = [...voters, voter]
    await writeFile(file, `${JSON.stringify(votes, null, 2)}\n`)
  }
  return votes[number] ?? voters
}
