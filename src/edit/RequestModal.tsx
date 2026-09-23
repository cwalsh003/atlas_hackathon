import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useEditMode } from './EditModeContext'

const REQUESTER_KEY = 'asd.requester'

// The region as a viewer sees it, minus the demo-only controls inside it.
function regionMarkup(regionId: string): string {
  const region = document.querySelector(`[data-edit-id="${regionId}"]`)
  if (!region) return ''
  const clone = region.cloneNode(true) as Element
  clone.querySelectorAll('[data-demo]').forEach((node) => node.remove())
  return clone.outerHTML
}

export function RequestModal({
  regionId,
  onClose,
}: {
  regionId: string
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const { markTargeted } = useEditMode()
  const [prompt, setPrompt] = useState('')
  const [requester, setRequester] = useState(
    () => localStorage.getItem(REQUESTER_KEY) ?? '',
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [filed, setFiled] = useState<{ number: number; url: string } | null>(
    null,
  )

  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal()
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null
    setPending(true)
    setError('')
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prompt,
          regionId,
          markup: regionMarkup(regionId),
          requester,
          lane: submitter?.value,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error(json.error ?? `Request failed (${res.status})`)
      setFiled(json)
      markTargeted(regionId, json.number)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setPending(false)
    }
  }

  return createPortal(
    <dialog
      ref={dialog}
      data-demo
      className="request-modal"
      aria-label={`Request a change to ${regionId}`}
      onClose={onClose}
    >
      <h2 className="request-modal__title">
        Request a change to <code>{regionId}</code>
      </h2>
      {filed ? (
        <p className="request-modal__filed">
          Filed as{' '}
          <a href={filed.url} target="_blank" rel="noreferrer">
            issue #{filed.number}
          </a>
          .
        </p>
      ) : (
        <form onSubmit={submit}>
          <label>
            What should change?
            <textarea
              required
              maxLength={500}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </label>
          <label>
            Your name
            <input
              required
              maxLength={60}
              value={requester}
              onChange={(e) => {
                setRequester(e.target.value)
                localStorage.setItem(REQUESTER_KEY, e.target.value)
              }}
            />
          </label>
          <div className="request-modal__lanes">
            <button type="submit" value="implement" disabled={pending}>
              <strong>Build it</strong>
              <span>
                Atlas triages it and, when it is small, ships it behind a flag
              </span>
            </button>
            <button type="submit" value="vote" disabled={pending}>
              <strong>Put it to a vote</strong>
              <span>Goes on the vote page for coworkers to vote</span>
            </button>
          </div>
          {error && (
            <p role="alert" className="request-modal__error">
              {error}
            </p>
          )}
        </form>
      )}
      <button
        type="button"
        className="request-modal__close"
        onClick={() => dialog.current?.close()}
      >
        Close
      </button>
    </dialog>,
    document.body,
  )
}
