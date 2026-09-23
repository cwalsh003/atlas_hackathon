export type WorkOrderStatus = 'scheduled' | 'plowing' | 'done' | 'buried'

export interface WorkOrder {
  id: string
  driveway: string
  town: string
  yeti: string
  status: WorkOrderStatus
  due: string
}

export const yetis = ['Frosty', 'Blizzard', 'Powder', 'Chilly', 'Glacier']

export const workOrders: WorkOrder[] = [
  {
    id: 'WO-101',
    driveway: '12 Birch Hollow',
    town: 'Lake Placid',
    yeti: 'Frosty',
    status: 'scheduled',
    due: '2026-01-05',
  },
  {
    id: 'WO-102',
    driveway: '4 Maple Ridge',
    town: 'Saranac Lake',
    yeti: 'Blizzard',
    status: 'plowing',
    due: '2026-01-05',
  },
  {
    id: 'WO-103',
    driveway: '88 Whiteface Rd',
    town: 'Wilmington',
    yeti: 'Powder',
    status: 'done',
    due: '2026-01-05',
  },
  {
    id: 'WO-104',
    driveway: '21 Cascade Way',
    town: 'Keene',
    yeti: 'Chilly',
    status: 'buried',
    due: '2026-01-05',
  },
  {
    id: 'WO-105',
    driveway: '9 Adirondack Loop',
    town: 'Tupper Lake',
    yeti: 'Glacier',
    status: 'scheduled',
    due: '2026-01-05',
  },
  {
    id: 'WO-106',
    driveway: '33 Frost Ln',
    town: 'Lake Placid',
    yeti: 'Frosty',
    status: 'done',
    due: '2026-01-06',
  },
  {
    id: 'WO-107',
    driveway: '17 Summit Ave',
    town: 'Saranac Lake',
    yeti: 'Blizzard',
    status: 'plowing',
    due: '2026-01-06',
  },
  {
    id: 'WO-108',
    driveway: '5 Cobble Hill Rd',
    town: 'Wilmington',
    yeti: 'Powder',
    status: 'scheduled',
    due: '2026-01-06',
  },
  {
    id: 'WO-109',
    driveway: '60 Northway Dr',
    town: 'Keene',
    yeti: 'Chilly',
    status: 'buried',
    due: '2026-01-06',
  },
  {
    id: 'WO-110',
    driveway: '2 Tamarack Ct',
    town: 'Tupper Lake',
    yeti: 'Glacier',
    status: 'done',
    due: '2026-01-07',
  },
  {
    id: 'WO-111',
    driveway: '48 Snowbird Ln',
    town: 'Lake Placid',
    yeti: 'Frosty',
    status: 'plowing',
    due: '2026-01-07',
  },
  {
    id: 'WO-112',
    driveway: '15 Ridgeline Dr',
    town: 'Saranac Lake',
    yeti: 'Blizzard',
    status: 'scheduled',
    due: '2026-01-07',
  },
]

export const kpis = {
  ordersToday: workOrders.length,
  plowingNow: workOrders.filter((order) => order.status === 'plowing').length,
  done: workOrders.filter((order) => order.status === 'done').length,
  buried: workOrders.filter((order) => order.status === 'buried').length,
}

export const ordersPerYeti = yetis.map((yeti) => ({
  yeti,
  count: workOrders.filter((order) => order.yeti === yeti).length,
}))
