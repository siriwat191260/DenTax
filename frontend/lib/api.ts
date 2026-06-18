import { createClient } from './supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

async function getAuthHeader(): Promise<HeadersInit> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return {}
  return { Authorization: `Bearer ${session.access_token}` }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const authHeader = await getAuthHeader()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(error || `API error ${res.status}`)
  }

  return res.json()
}

// ── Receipts ──────────────────────────────────────────────────

export interface ReceiptItem {
  name: string
  amount: number
}

export interface Receipt {
  id: string
  date: string           // 'YYYY-MM-DD'
  incomeType: '40-1' | '40-2' | '40-6'
  category: string
  patient?: string
  payment: string
  total: number
  note?: string
  imageUrl?: string
  items: ReceiptItem[]
  createdAt: string
}

export interface CreateReceiptDto {
  date: string
  incomeType: '40-1' | '40-2' | '40-6'
  category: string
  patient?: string
  payment: string
  total: number
  note?: string
  imageUrl?: string
  items: ReceiptItem[]
}

export const receiptsApi = {
  list: (params?: { from?: string; to?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
    return apiFetch<Receipt[]>(`/api/receipts${qs}`)
  },
  create: (data: CreateReceiptDto) =>
    apiFetch<Receipt>('/api/receipts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CreateReceiptDto>) =>
    apiFetch<Receipt>(`/api/receipts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<void>(`/api/receipts/${id}`, { method: 'DELETE' }),

  summary: (year: number) =>
    apiFetch<{
      today: number; thisMonth: number; thisYear: number
      countToday: number; countMonth: number; countYear: number
      byMonth: { month: number; total: number }[]
      byCategory: { category: string; total: number }[]
    }>(`/api/receipts/summary?year=${year}`),
}

// ── Scan (AI OCR) ─────────────────────────────────────────────

export interface ScanResult {
  date: string | null
  patient: string
  category: string
  payment: string
  items: ReceiptItem[]
  total: number
  note: string
  confidence: number
}

export const scanApi = {
  scanImage: async (file: File): Promise<ScanResult> => {
    const authHeader = await getAuthHeader()
    const formData = new FormData()
    formData.append('image', file)

    const res = await fetch(`${API_URL}/api/scan`, {
      method: 'POST',
      headers: { ...authHeader } as HeadersInit,
      body: formData,
    })

    if (!res.ok) throw new Error(`Scan failed: ${res.status}`)
    return res.json()
  },
}

// ── Tax ───────────────────────────────────────────────────────

export interface TaxSettings {
  taxYear: number
  incomeType: '40-1' | '40-2' | '40-6'
  deductPersonal: number
  deductSpouse: number
  deductChild: number
  deductParent: number
  deductLifeIns: number
  deductHealthIns: number
  deductRmf: number
  deductSsf: number
  deductPvd: number
  deductOther: number
  extraIncome: number
}

export interface TaxCalculation {
  grossIncome: number
  expenseDeduction: number
  netAfterExpense: number
  totalDeductions: number
  netIncome: number
  tax: number
  effectiveRate: number
  halfYearTax: number
  bracket: number
}

export const taxApi = {
  getSettings: (year: number) =>
    apiFetch<TaxSettings>(`/api/tax/settings/${year}`),
  saveSettings: (data: TaxSettings) =>
    apiFetch<TaxSettings>('/api/tax/settings', { method: 'POST', body: JSON.stringify(data) }),
  calculate: (data: TaxSettings) =>
    apiFetch<TaxCalculation>('/api/tax/calculate', { method: 'POST', body: JSON.stringify(data) }),
}
