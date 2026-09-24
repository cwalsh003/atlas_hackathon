import { workOrders, yetis } from '../mockData'
import { Region } from './Region'

export function YetiRoster() {
  const roster = yetis.map((yeti) => ({
    yeti,
    plowing: workOrders.some(
      (order) => order.yeti === yeti && order.status === 'plowing',
    ),
  }))

  return (
    <Region id="roster" className="roster">
      <h2 className="roster__title">Crew roster</h2>
      <ul className="roster__list">
        {roster.map((entry) => (
          <li className="roster__item" key={entry.yeti}>
            <span>{entry.yeti}</span>
            <span>{entry.plowing ? 'plowing' : 'idle'}</span>
          </li>
        ))}
      </ul>
    </Region>
  )
}
