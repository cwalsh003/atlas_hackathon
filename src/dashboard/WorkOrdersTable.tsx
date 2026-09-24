import { workOrders } from '../mockData'
import { Region } from './Region'

export function WorkOrdersTable() {
  return (
    <Region id="orders" className="orders">
      <table className="orders__table">
        <thead>
          <tr>
            <Region as="th" id="col-order">
              Order
            </Region>
            <Region as="th" id="col-driveway">
              Driveway
            </Region>
            <Region as="th" id="col-town">
              Town
            </Region>
            <Region as="th" id="col-yeti">
              Crew
            </Region>
            <Region as="th" id="col-status">
              Status
            </Region>
            <Region as="th" id="col-due">
              Due
            </Region>
          </tr>
        </thead>
        <tbody>
          {workOrders.map((order) => (
            <tr key={order.id}>
              <td>{order.id}</td>
              <td>{order.driveway}</td>
              <td>{order.town}</td>
              <td>{order.yeti}</td>
              <td>{order.status}</td>
              <td>{order.due}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Region>
  )
}
