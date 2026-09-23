import type { ReactNode } from 'react'

export function Region({
  id,
  as = 'section',
  className,
  children,
}: {
  id: string
  as?: 'section' | 'header' | 'footer' | 'th'
  className?: string
  children: ReactNode
}) {
  const Tag = as
  return (
    <Tag data-edit-id={id} className={className}>
      {children}
    </Tag>
  )
}
