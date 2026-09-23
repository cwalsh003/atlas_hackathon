import { kpis } from '../mockData'
import { Region } from './Region'

export function KpiCards() {
  return (
    <div className="kpi-cards">
      <Region id="kpi-orders" className="kpi-card">
        <span className="kpi-card__label">Orders today</span>
        <span className="kpi-card__value">{kpis.ordersToday}</span>
      </Region>
      <Region id="kpi-plowing" className="kpi-card">
        <span className="kpi-card__label">Plowing now</span>
        <span className="kpi-card__value">{kpis.plowingNow}</span>
      </Region>
      <Region id="kpi-done" className="kpi-card">
        <span className="kpi-card__label">Done</span>
        <span className="kpi-card__value">{kpis.done}</span>
      </Region>
      <Region id="kpi-buried" className="kpi-card">
        <span className="kpi-card__label">Buried</span>
        <span className="kpi-card__value">{kpis.buried}</span>
      </Region>
    </div>
  )
}
