// PROTOTYPE, throwaway. Mock data for Abominable Snow Services.
export type Status = 'scheduled' | 'plowing' | 'done' | 'buried'
export type WorkOrder = {
  id: string
  driveway: string
  town: string
  yeti: string
  status: Status
  due: string
}
export type RequestState =
  | 'none'
  | 'queued'
  | 'triage'
  | 'building'
  | 'pr'
  | 'waiting'
  | 'shipped'
  | 'declined'

export const yetis = ['Gus', 'Marla', 'Pib', 'Ozzy', 'Nell']
export const orders: WorkOrder[] = [
  {
    id: 'WO-1041',
    driveway: '12 Birch Ln',
    town: 'Niskayuna',
    yeti: 'Gus',
    status: 'done',
    due: '6:00',
  },
  {
    id: 'WO-1042',
    driveway: '88 Union St',
    town: 'Schenectady',
    yeti: 'Marla',
    status: 'plowing',
    due: '6:30',
  },
  {
    id: 'WO-1043',
    driveway: '3 Elk Hollow',
    town: 'Glenville',
    yeti: 'Pib',
    status: 'buried',
    due: '6:30',
  },
  {
    id: 'WO-1044',
    driveway: '401 Balltown Rd',
    town: 'Niskayuna',
    yeti: 'Ozzy',
    status: 'scheduled',
    due: '7:00',
  },
  {
    id: 'WO-1045',
    driveway: '19 Maple Ave',
    town: 'Scotia',
    yeti: 'Nell',
    status: 'plowing',
    due: '7:00',
  },
  {
    id: 'WO-1046',
    driveway: '7 Frost Ct',
    town: 'Rotterdam',
    yeti: 'Gus',
    status: 'scheduled',
    due: '7:30',
  },
  {
    id: 'WO-1047',
    driveway: '250 State St',
    town: 'Schenectady',
    yeti: 'Marla',
    status: 'done',
    due: '7:30',
  },
  {
    id: 'WO-1048',
    driveway: '5 Drumlin Way',
    town: 'Glenville',
    yeti: 'Pib',
    status: 'scheduled',
    due: '8:00',
  },
  {
    id: 'WO-1049',
    driveway: '61 Pine Ridge',
    town: 'Rotterdam',
    yeti: 'Ozzy',
    status: 'buried',
    due: '8:00',
  },
  {
    id: 'WO-1050',
    driveway: '14 Snowden Pl',
    town: 'Scotia',
    yeti: 'Nell',
    status: 'done',
    due: '8:30',
  },
  {
    id: 'WO-1051',
    driveway: '2 Icicle Dr',
    town: 'Niskayuna',
    yeti: 'Gus',
    status: 'scheduled',
    due: '9:00',
  },
  {
    id: 'WO-1052',
    driveway: '77 Mohawk Ave',
    town: 'Scotia',
    yeti: 'Marla',
    status: 'scheduled',
    due: '9:30',
  },
]
export const kpis = [
  { id: 'kpi-orders', label: 'Orders today', value: String(orders.length) },
  {
    id: 'kpi-buried',
    label: 'Buried',
    value: String(orders.filter((o) => o.status === 'buried').length),
  },
  { id: 'kpi-clear', label: 'Avg clear time', value: '23 min' },
  { id: 'kpi-yetis', label: 'Yetis on shift', value: String(yetis.length) },
]
export const perYeti = yetis.map((y) => ({
  yeti: y,
  count: orders.filter((o) => o.yeti === y).length,
}))

export const pillCopy: Record<RequestState, string> = {
  none: '',
  queued: 'Queued',
  triage: 'Triaging',
  building: 'Building',
  pr: 'PR open',
  waiting: 'Waiting for approval',
  shipped: 'Shipped',
  declined: 'Declined',
}
export const requestStates: RequestState[] = [
  'none',
  'queued',
  'triage',
  'building',
  'pr',
  'waiting',
  'shipped',
  'declined',
]
