// PROTOTYPE, throwaway. Variant C: phone-first single column of big tiles. In edit mode the whole
// tile is the tap target (no pens); a bottom sheet holds the prompt with a lane radio; the pill is a
// strip across the top of the tile with the issue link.
import { kpis, orders, perYeti, pillCopy, yetis } from './data'
import type { VariantProps } from './PrototypeDashboard'

export function VariantC({ edit, state, target, onPick }: VariantProps) {
  const Tile = ({
    id,
    title,
    children,
  }: {
    id: string
    title?: string
    children: React.ReactNode
  }) => (
    <section
      data-edit-id={id}
      className={`c-tile ${edit ? 'tappable' : ''} ${target === id ? 'targeted' : ''}`}
      onClick={edit ? () => onPick(id) : undefined}
    >
      {target === id && state !== 'none' && (
        <div className={`strip strip-${state}`}>
          {pillCopy[state]} · <u>#42</u>
        </div>
      )}
      {title && <h2>{title}</h2>}
      {children}
    </section>
  )
  const max = Math.max(...perYeti.map((p) => p.count))
  return (
    <div className="c-page">
      <Tile id="header">
        <div className="brand">
          <span className="logo">❄</span>
          <div>
            <h1>Abominable Snow Services</h1>
            <small>Built by Jahnel Group</small>
          </div>
        </div>
        {edit && (
          <div className="c-hint">
            Edit mode: tap anything to request a change
          </div>
        )}
      </Tile>
      <div className="c-kpis">
        {kpis.map((k) => (
          <Tile key={k.id} id={k.id}>
            <b className="kpi-value">{k.value}</b>
            <span className="kpi-label">{k.label}</span>
          </Tile>
        ))}
      </div>
      <Tile id="chart" title="Orders per yeti">
        {perYeti.map((p) => (
          <div key={p.yeti} className="bar-row">
            <span>{p.yeti}</span>
            <div
              className="bar"
              style={{ width: `${(p.count / max) * 100}%` }}
            />
            <b>{p.count}</b>
          </div>
        ))}
      </Tile>
      <Tile id="orders" title="Work orders">
        {orders.slice(0, 6).map((o) => (
          <div key={o.id} className="c-order">
            <div>
              <b>{o.driveway}</b>
              <small>
                {o.town} · {o.yeti} · due {o.due}
              </small>
            </div>
            <span className={`status status-${o.status}`}>{o.status}</span>
          </div>
        ))}
        <a className="more">All {orders.length} orders →</a>
      </Tile>
      <Tile id="roster" title="Yetis on shift">
        <div className="c-roster">
          {yetis.map((y) => (
            <span key={y} className="avatar-lg">
              {y}
            </span>
          ))}
        </div>
      </Tile>
      {target && state === 'none' && (
        <div className="sheet-backdrop" onClick={() => onPick(null)}>
          <form
            className="sheet"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="grabber" />
            <b>
              Change <code>{target}</code>
            </b>
            <textarea
              rows={3}
              placeholder="What do you want changed?"
              autoFocus
            />
            <input placeholder="Your name" />
            <div className="radio-row">
              <label>
                <input type="radio" name="lane" defaultChecked /> Build it
              </label>
              <label>
                <input type="radio" name="lane" /> Vote on it
              </label>
            </div>
            <button className="primary">Send to Atlas</button>
          </form>
        </div>
      )}
    </div>
  )
}
