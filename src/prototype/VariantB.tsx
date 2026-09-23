// PROTOTYPE, throwaway. Variant B: dense dispatch sheet. Table is the page; KPIs and chart live in a
// left rail. Regions highlight on hover with a pen at the corner (desktop feel). Prompt is a right-side
// drawer; lane is a segmented toggle; the pill is a full-width banner across the top of the region.
import { kpis, orders, perYeti, pillCopy } from './data'
import type { VariantProps } from './PrototypeDashboard'

export function VariantB({ edit, state, target, onPick }: VariantProps) {
  const Region = ({
    id,
    className = '',
    children,
  }: {
    id: string
    className?: string
    children: React.ReactNode
  }) => (
    <div
      data-edit-id={id}
      className={`b-region ${className} ${edit ? 'hoverable' : ''} ${target === id ? 'targeted' : ''}`}
      onClick={edit ? () => onPick(id) : undefined}
    >
      {target === id && state !== 'none' && (
        <div className={`banner banner-${state}`}>{pillCopy[state]}</div>
      )}
      {edit && <span className="pen-corner">✎ edit</span>}
      {children}
    </div>
  )
  const max = Math.max(...perYeti.map((p) => p.count))
  return (
    <div
      className={`b-page ${target && state === 'none' ? 'drawer-open' : ''}`}
    >
      <aside className="b-rail">
        <Region id="header" className="b-brand">
          <span className="logo">❄</span>
          <b>Abominable Snow Services</b>
          <small>Dispatch sheet</small>
        </Region>
        {kpis.map((k) => (
          <Region key={k.id} id={k.id} className="b-kpi">
            <span>{k.label}</span>
            <b>{k.value}</b>
          </Region>
        ))}
        <Region id="chart" className="b-chart">
          <span>Orders per yeti</span>
          {perYeti.map((p) => (
            <div key={p.yeti} className="b-bar">
              <i style={{ height: `${(p.count / max) * 48}px` }} />
              <small>{p.yeti}</small>
            </div>
          ))}
        </Region>
        <Region id="footer" className="b-footer">
          Built by Jahnel Group
        </Region>
      </aside>
      <main className="b-main">
        <div className="b-toolbar">
          <h1>Work orders · Sep 23</h1>
          <input placeholder="Filter…" />
          <label className="edit-toggle">
            <input type="checkbox" checked={edit} readOnly /> Edit mode
          </label>
        </div>
        <Region id="orders" className="b-table">
          <table>
            <thead>
              <tr>
                {['Order', 'Driveway', 'Town', 'Yeti', 'Status', 'Due'].map(
                  (h) => (
                    <th key={h}>{h}</th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  className={o.status === 'buried' ? 'row-buried' : ''}
                >
                  <td>{o.id}</td>
                  <td>{o.driveway}</td>
                  <td>{o.town}</td>
                  <td>{o.yeti}</td>
                  <td>
                    <span className={`status status-${o.status}`}>
                      {o.status}
                    </span>
                  </td>
                  <td>{o.due}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Region>
      </main>
      {target && state === 'none' && (
        <aside className="drawer" onClick={(e) => e.stopPropagation()}>
          <header>
            <b>Change request</b>
            <button onClick={() => onPick(null)}>✕</button>
          </header>
          <p>
            Region: <code>{target}</code>
          </p>
          <div className="segmented">
            <button className="on">Build</button>
            <button>Vote</button>
          </div>
          <textarea rows={5} placeholder="Describe the change" autoFocus />
          <input placeholder="Your name" />
          <button className="primary">Submit</button>
          <pre className="drawer-preview">{`<section data-edit-id="${target}">…</section>`}</pre>
        </aside>
      )}
    </div>
  )
}
