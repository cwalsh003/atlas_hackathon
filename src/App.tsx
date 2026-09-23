import { Footer } from './dashboard/Footer'
import { Header } from './dashboard/Header'
import { KpiCards } from './dashboard/KpiCards'
import { OrdersChart } from './dashboard/OrdersChart'
import { WorkOrdersTable } from './dashboard/WorkOrdersTable'
import { YetiRoster } from './dashboard/YetiRoster'

export default function App() {
  return (
    <div className="dashboard">
      <Header />
      <KpiCards />
      <div className="dashboard__split">
        <OrdersChart />
        <YetiRoster />
      </div>
      <WorkOrdersTable />
      <Footer />
    </div>
  )
}
