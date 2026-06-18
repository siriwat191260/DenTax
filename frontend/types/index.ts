export type IncomeType = '40-1' | '40-2' | '40-6'
export type ViewPeriod = 'day' | 'month' | 'year'

export const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  '40-1': 'ม.40(1) — เงินเดือน',
  '40-2': 'ม.40(2) — รับจ็อบ',
  '40-6': 'ม.40(6) — คลินิกส่วนตัว',
}

export const INCOME_TYPE_BADGE: Record<IncomeType, string> = {
  '40-1': 'badge badge-blue',
  '40-2': 'badge badge-green',
  '40-6': 'badge badge-teal',
}

export const CATEGORIES = [
  'ตรวจและทำความสะอาดฟัน',
  'อุดฟัน',
  'ถอนฟัน',
  'รักษารากฟัน',
  'จัดฟัน',
  'ครอบฟัน/สะพานฟัน',
  'ฟันปลอม',
  'ฟอกสีฟัน',
  'รายได้อื่นๆ',
] as const

export const PAYMENT_METHODS = [
  'เงินสด',
  'โอนเงิน',
  'บัตรเครดิต/เดบิต',
  'ประกัน',
  'อื่นๆ',
] as const

// Tax brackets (Thai personal income tax 2024)
export const TAX_BRACKETS = [
  { min: 0,       max: 150_000,    rate: 0    },
  { min: 150_001, max: 300_000,    rate: 0.05 },
  { min: 300_001, max: 500_000,    rate: 0.10 },
  { min: 500_001, max: 750_000,    rate: 0.15 },
  { min: 750_001, max: 1_000_000,  rate: 0.20 },
  { min: 1_000_001,max:2_000_000,  rate: 0.25 },
  { min: 2_000_001,max:5_000_000,  rate: 0.30 },
  { min: 5_000_001,max: Infinity,  rate: 0.35 },
]
