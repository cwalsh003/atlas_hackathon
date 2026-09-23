import { Footer } from './dashboard/Footer'
import { Header } from './dashboard/Header'
import { KpiCards } from './dashboard/KpiCards'
import { OrdersChart } from './dashboard/OrdersChart'
import { WorkOrdersTable } from './dashboard/WorkOrdersTable'
import { YetiRoster } from './dashboard/YetiRoster'
import { isDemoMode } from './demoMode'
import { EditModeProvider, useEditMode } from './edit/EditModeContext'

function HintBanner() {
  const { enabled, isPhone } = useEditMode()
  if (!enabled || !isPhone) return null
  return (
    <div data-demo className="hint-banner" role="status">
      Tap any region to request a change
    </div>
  )
}

function Dashboard() {
  return (
    <div className="dashboard">
      <Header />
      {isDemoMode && <HintBanner />}
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

export default function App() {
  return isDemoMode ? (
    <EditModeProvider>
      <Dashboard />
    </EditModeProvider>
  ) : (
    <Dashboard />
  )
}
