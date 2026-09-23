import { ordersPerYeti } from '../mockData'
import { Region } from './Region'

export function OrdersChart() {
  const max = Math.max(...ordersPerYeti.map((entry) => entry.count), 1)

  return (
    <Region id="chart" className="chart">
      <h2 className="chart__title">Orders per yeti</h2>
      <div className="chart__bars">
        {ordersPerYeti.map((entry) => (
          <div className="chart__bar-row" key={entry.yeti}>
            <span className="chart__bar-label">{entry.yeti}</span>
            <div
              className="chart__bar"
              style={{ width: `${(entry.count / max) * 100}%` }}
            />
            <span className="chart__bar-count">{entry.count}</span>
          </div>
        ))}
      </div>
    </Region>
  )
}
