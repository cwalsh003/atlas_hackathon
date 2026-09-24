import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addVote, readVotes } from './voteStore.ts'

let dir: string
let file: string

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'asd-votes-'))
  file = path.join(dir, 'votes.local.json')
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('vote store', () => {
  it('reads a missing votes file as no votes', async () => {
    expect(await readVotes(file)).toEqual({})
  })

  it('counts the same voter twice on one proposal once', async () => {
    await addVote(file, 31, 'Colin')
    expect(await addVote(file, 31, 'Colin')).toEqual(['Colin'])
    expect(await readVotes(file)).toEqual({ '31': ['Colin'] })
  })

  it('counts two voters on one proposal twice', async () => {
    await addVote(file, 31, 'Colin')
    expect(await addVote(file, 31, 'Dana')).toEqual(['Colin', 'Dana'])
  })

  it('keeps each proposal to its own voters', async () => {
    await addVote(file, 31, 'Colin')
    await addVote(file, 32, 'Colin')
    expect(await readVotes(file)).toEqual({
      '31': ['Colin'],
      '32': ['Colin'],
    })
  })
})
