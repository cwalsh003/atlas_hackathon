import { useState } from 'react'
import { PILL_TEXT } from './pillState.ts'
import type { PillRequest } from './statusStore.ts'

/** The status pill on a requested region: its state, linking to the issue. */
export function StatusPill({
  request,
  isPhone,
}: {
  request: PillRequest
  isPhone: boolean
}) {
  const [showComment, setShowComment] = useState(false)
  // Phones have no hover, so a tap on a declined pill toggles the comment.
  const tapForComment =
    isPhone && request.state === 'declined' && request.comment
  return (
    <a
      data-demo
      className={`pill pill--${request.state}`}
      href={request.url}
      target="_blank"
      rel="noreferrer"
      title={request.comment}
      onClick={
        tapForComment
          ? (event) => {
              event.preventDefault()
              setShowComment((shown) => !shown)
            }
          : undefined
      }
    >
      {PILL_TEXT[request.state]}
      {showComment && <span className="pill__comment">{request.comment}</span>}
    </a>
  )
}
