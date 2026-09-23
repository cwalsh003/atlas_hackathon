// PROTOTYPE, throwaway. Variant A: classic ops board. Pens always visible in edit mode (phone-safe).
// Prompt is a centered modal; lane is two big buttons; pill sits in the region's top-right corner.
import { kpis, orders, perYeti, pillCopy, yetis } from './data'
import type { VariantProps } from './PrototypeDashboard'

export function VariantA({ edit, state, target, onPick }: VariantProps) {
  const Region = ({
    id,
    className = '',
    children,
  }: {
    id: string
    className?: string
    children: React.ReactNode
  }) => (
    <section
      data-edit-id={id}
      className={`a-region ${className} ${edit ? 'editable' : ''} ${target === id ? 'targeted' : ''}`}
    >
      {children}
      {edit && (
        <button
          className="pen"
          aria-label={`Request a change to ${id}`}
          onClick={() => onPick(id)}
        >
          ✎
        </button>
      )}
      {target === id && state !== 'none' && (
        <span className={`pill pill-${state}`}>{pillCopy[state]}</span>
      )}
    </section>
  )
  const max = Math.max(...perYeti.map((p) => p.count))
  return (
    <div className="a-page">
      <Region id="header" className="a-header">
        <div className="brand">
          <span className="logo">❄</span>
          <div>
            <h1>Abominable Snow Services</h1>
            <small>Dispatch · Tuesday, Sep 23 · 6:12 AM</small>
          </div>
        </div>
        <nav>
          <a className="active">Dispatch</a>
          <a>Routes</a>
          <a>Invoices</a>
          <a>Yetis</a>
        </nav>
        <label className="edit-toggle">
          <input type="checkbox" checked={edit} readOnly /> Edit mode
        </label>
      </Region>
      <div className="a-kpis">
        {kpis.map((k) => (
          <Region key={k.id} id={k.id} className="kpi">
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-label">{k.label}</div>
          </Region>
        ))}
      </div>
      <div className="a-main">
        <Region id="chart" className="a-chart">
          <h2>Orders per yeti</h2>
          <div className="bars">
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
          </div>
        </Region>
        <Region id="roster" className="a-roster">
          <h2>Yetis on shift</h2>
          <ul>
            {yetis.map((y) => (
              <li key={y}>
                <span className="avatar">{y[0]}</span> {y}
                <small>
                  {orders.filter((o) => o.yeti === y && o.status === 'plowing')
                    .length
                    ? 'plowing'
                    : 'idle'}
                </small>
              </li>
            ))}
          </ul>
        </Region>
      </div>
      <Region id="orders" className="a-table">
        <h2>Work orders</h2>
        <table>
          <thead>
            <tr>
              {['Order', 'Driveway', 'Town', 'Yeti', 'Status', 'Due'].map(
                (h) => (
                  <th key={h} data-edit-id={`col-${h.toLowerCase()}`}>
                    {h}
                    {edit && (
                      <button
                        className="pen pen-inline"
                        onClick={() => onPick(`col-${h.toLowerCase()}`)}
                      >
                        ✎
                      </button>
                    )}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
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
      <Region id="footer" className="a-footer">
        Built by Jahnel Group
      </Region>
      {target && state === 'none' && (
        <div className="modal-backdrop" onClick={() => onPick(null)}>
          <form
            className="modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => e.preventDefault()}
          >
            <h3>
              Request a change to <code>{target}</code>
            </h3>
            <textarea
              placeholder="What should be different here?"
              rows={3}
              autoFocus
            />
            <input placeholder="Your name" />
            <div className="lanes">
              <button type="button" className="lane lane-implement">
                <b>Build it</b>
                <small>Atlas triages and ships small changes now</small>
              </button>
              <button type="button" className="lane lane-vote">
                <b>Put it to a vote</b>
                <small>Goes on the vote page for the room</small>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
