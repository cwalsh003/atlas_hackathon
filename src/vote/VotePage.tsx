import { useEffect, useState } from 'react'

// Same key as the request modal, so a requester votes under the same name.
const REQUESTER_KEY = 'asd.requester'
const POLL_MS = 5000

type Proposal = {
  number: number
  regionId: string
  prompt: string
  requester: string
  url: string
  createdAt: string
  votes: number
  voters: string[]
}

type Promoted = { proposal: number; number: number; url: string }

async function call(init?: { body: object }) {
  const res = await fetch(
    '/api/votes',
    init && {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(init.body),
    },
  )
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`)
  return json
}

export function VotePage() {
  const [proposals, setProposals] = useState<Proposal[] | null>(null)
  const [voter, setVoter] = useState(
    () => localStorage.getItem(REQUESTER_KEY) ?? '',
  )
  const [pending, setPending] = useState<number | null>(null)
  const [promoted, setPromoted] = useState<Promoted[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const json = await call()
        if (active) setProposals(json.proposals)
      } catch (err) {
        if (active) setError((err as Error).message)
      }
    }
    void load()
    const timer = setInterval(load, POLL_MS)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  async function act<T>(number: number, body: object, done: (json: T) => void) {
    setPending(number)
    setError('')
    try {
      done(await call({ body }))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setPending(null)
    }
  }

  const vote = (number: number) =>
    act(number, { number, voter }, (updated: Proposal) =>
      setProposals((list) =>
        (list ?? []).map((p) => (p.number === number ? updated : p)),
      ),
    )

  const promote = (number: number) =>
    act(number, { action: 'promote', number }, (issue: Promoted) => {
      setPromoted((list) => [...list, { ...issue, proposal: number }])
      setProposals((list) => (list ?? []).filter((p) => p.number !== number))
    })

  const name = voter.trim()

  return (
    <div data-demo className="vote-page">
      <header className="vote-page__header">
        <h1>Proposals</h1>
        <a href="/">Back to the dashboard</a>
      </header>
      <p className="vote-page__note">
        Votes could flow to Slack or Jira later.
      </p>
      <label className="vote-page__voter">
        Voting as
        <input
          maxLength={60}
          placeholder="Your name"
          value={voter}
          onChange={(e) => {
            setVoter(e.target.value)
            localStorage.setItem(REQUESTER_KEY, e.target.value)
          }}
        />
      </label>
      {error && (
        <p role="alert" className="vote-page__error">
          {error}
        </p>
      )}
      {promoted.map((p) => (
        <p key={p.number} role="status" className="vote-page__promoted">
          Promoted #{p.proposal} to{' '}
          <a href={p.url} target="_blank" rel="noreferrer">
            issue #{p.number}
          </a>
          .
        </p>
      ))}
      {proposals === null ? (
        <p>Loading proposals…</p>
      ) : proposals.length === 0 ? (
        <p>No proposals yet. Put a request to a vote from edit mode.</p>
      ) : (
        <ul className="vote-page__list">
          {proposals.map((p) => {
            const voted = p.voters.includes(name)
            return (
              <li key={p.number} className="vote-page__proposal">
                <p className="vote-page__prompt">{p.prompt}</p>
                <p className="vote-page__meta">
                  Region <code>{p.regionId}</code> · Requested by{' '}
                  <strong>{p.requester}</strong> ·{' '}
                  <a href={p.url} target="_blank" rel="noreferrer">
                    #{p.number}
                  </a>
                </p>
                <div className="vote-page__actions">
                  <span className="vote-page__count">
                    {p.votes} {p.votes === 1 ? 'vote' : 'votes'}
                  </span>
                  <button
                    type="button"
                    disabled={!name || voted || pending !== null}
                    onClick={() => vote(p.number)}
                  >
                    {voted ? 'Voted' : 'Vote'}
                  </button>
                  <button
                    type="button"
                    className="vote-page__promote"
                    disabled={pending !== null}
                    onClick={() => promote(p.number)}
                  >
                    Promote
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
