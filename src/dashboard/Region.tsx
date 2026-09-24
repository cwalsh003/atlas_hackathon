import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { isDemoMode } from '../demoMode'
import { useEditMode } from '../edit/EditModeContext'
import { RequestModal } from '../edit/RequestModal'
import { StatusPill } from '../status/StatusPill'
import { useRegionRequest } from '../status/statusStore'

type RegionProps = {
  id: string
  as?: 'section' | 'header' | 'footer' | 'th'
  className?: string
  children: ReactNode
}

function PlainRegion({ id, as = 'section', className, children }: RegionProps) {
  const Tag = as
  return (
    <Tag data-edit-id={id} className={className}>
      {children}
    </Tag>
  )
}

function EditableRegion({
  id,
  as = 'section',
  className,
  children,
}: RegionProps) {
  const { enabled, isPhone, targeted } = useEditMode()
  const [open, setOpen] = useState(false)
  const Tag = as
  const issue = targeted[id]
  const request = useRegionRequest(id, issue)
  const showPen = enabled && !isPhone

  // On phones the whole region is the tap target. Ignore events from demo-only
  // controls (the toggle, the modal) and stop nested regions opening twice.
  function openFromRegion(event: {
    target: EventTarget
    stopPropagation(): void
  }) {
    if ((event.target as Element).closest('[data-demo]')) return
    event.stopPropagation()
    setOpen(true)
  }
  const tapTarget =
    enabled && isPhone
      ? {
          role: 'button',
          tabIndex: 0,
          onClick: openFromRegion,
          onKeyDown: (event: KeyboardEvent) => {
            if (event.key !== 'Enter' && event.key !== ' ') return
            if ((event.target as Element).closest('[data-demo]')) return
            event.preventDefault()
            openFromRegion(event)
          },
        }
      : {}

  return (
    <Tag
      data-edit-id={id}
      data-request={issue}
      className={
        [
          className,
          enabled && 'region--edit',
          issue && 'region--targeted',
          request && 'region--pill',
        ]
          .filter(Boolean)
          .join(' ') || undefined
      }
      {...tapTarget}
    >
      {children}
      {(request || showPen) && (
        <div data-demo className="region-controls">
          {request && <StatusPill request={request} isPhone={isPhone} />}
          {showPen && (
            <button
              type="button"
              data-demo
              className="pen"
              aria-label={`Request a change to ${id}`}
              onClick={() => setOpen(true)}
            >
              ✎
            </button>
          )}
        </div>
      )}
      {open && <RequestModal regionId={id} onClose={() => setOpen(false)} />}
    </Tag>
  )
}

// Production builds fold this to PlainRegion and drop every edit-mode import.
export const Region = isDemoMode ? EditableRegion : PlainRegion
