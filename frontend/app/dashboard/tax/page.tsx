'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { Calculator, Landmark, TrendingUp, Info } from 'lucide-react'
import { Card, Button, PageHeader } from '@/components/ui'
import { taxApi, receiptsApi, type TaxSettings } from '@/lib/api'
import { TAX_BRACKETS } from '@/types'
import type { IncomeType } from '@/types'
import { useToast } from '@/hooks/useToast'

const INCOME_TYPES: { value: IncomeType; title: string; sub: string; deductLabel: string }[] = [
  {
    value: '40-1',
    title: 'มาตรา 40(1) — เงินเดือน/ค่าจ้างประจำ',
    sub: 'ทันตแพทย์ประจำโรงพยาบาลรัฐหรือเอกชน',
    deductLabel: 'หักค่าใช้จ่าย 50% ไม่เกิน 100,000 บาท/ปี',
  },
  {
    value: '40-2',
    title: 'มาตรา 40(2) — รับจ็อบ/เข้าเวรคลินิก',
    sub: 'ค่าตอบแทนรับจ็อบตรวจรักษา',
    deductLabel: 'หักค่าใช้จ่าย 50% รวม 40(1) ไม่เกิน 100,000 บาท/ปี',
  },
  {
    value: '40-6',
    title: 'มาตรา 40(6) — คลินิกส่วนตัว/วิชาชีพอิสระ',
    sub: 'การประกอบโรคศิลปะ',
    deductLabel: 'หักค่าใช้จ่าย 60% ไม่เกิน 600,000 บาท/ปี หรือตามจริง',
  },
]

interface CalcResult {
  grossIncome: number; expenseDeduction: number; netAfterExpense: number
  totalDeductions: number; netIncome: number; tax: number
  effectiveRate: number; bracket: number; halfYearTax: number
}

function calcLocally(values: any, grossFromDb: number): CalcResult {
  const grossIncome = grossFromDb + (Number(values.extraIncome) || 0)
  const type = values.incomeType as IncomeType

  let expenseDeduction = 0
  if (type === '40-6') expenseDeduction = Math.min(grossIncome * 0.6,  600_000)
  else                 expenseDeduction = Math.min(grossIncome * 0.5,  100_000)

  const netAfterExpense = Math.max(0, grossIncome - expenseDeduction)

  const d = (key: string) => Number(values[key]) || 0
  const totalDeductions =
    Math.min(d('deductPersonal'),  999_999) +
    d('deductSpouse') +
    d('deductChild') +
    d('deductParent') +
    Math.min(d('deductLifeIns'),    100_000) +
    Math.min(d('deductHealthIns'),   25_000) +
    Math.min(d('deductRmf'),         grossIncome * 0.3) +
    Math.min(d('deductSsf'),         Math.min(grossIncome * 0.3, 200_000)) +
    Math.min(d('deductPvd'),         Math.min(grossIncome * 0.15, 500_000)) +
    d('deductOther')

  const netIncome = Math.max(0, netAfterExpense - totalDeductions)

  let tax = 0; let bracket = 0
  TAX_BRACKETS.forEach(({ min, max, rate }, i) => {
    if (netIncome > min) {
      bracket = i
      tax += (Math.min(netIncome, max) - min) * rate
    }
  })

  const effectiveRate = grossIncome > 0 ? (tax / grossIncome) * 100 : 0

  // Half-year estimate for 40(6)
  let halfYearTax = 0
  if (type === '40-6') {
    const halfIncome = grossFromDb / 2
    const halfExp    = Math.min(halfIncome * 0.6, 300_000)
    const halfNet    = Math.max(0, halfIncome - halfExp - totalDeductions / 2)
    TAX_BRACKETS.forEach(({ min, max, rate }) => {
      if (halfNet > min) halfYearTax += (Math.min(halfNet, max) - min) * rate
    })
  }

  return {
    grossIncome, expenseDeduction, netAfterExpense, totalDeductions,
    netIncome, tax: Math.round(tax), effectiveRate,
    bracket, halfYearTax: Math.round(halfYearTax),
  }
}

const fmtTHB = (n: number) => `฿${Math.round(n).toLocaleString()}`

export default function TaxPage() {
  const currentYear  = new Date().getFullYear()
  const [taxYear, setTaxYear]       = useState(currentYear)
  const [incomeType, setIncomeType] = useState<IncomeType>('40-6')
  const [grossFromDb, setGrossFromDb] = useState(0)
  const [result, setResult]         = useState<CalcResult | null>(null)
  const [saving, setSaving]         = useState(false)
  const { message, show }           = useToast()

  const { register, watch, reset } = useForm({
    defaultValues: {
      extraIncome:      0,
      incomeType:       '40-6' as IncomeType,
      deductPersonal:   60_000,
      deductSpouse:     0,
      deductChild:      0,
      deductParent:     0,
      deductLifeIns:    0,
      deductHealthIns:  0,
      deductRmf:        0,
      deductSsf:        0,
      deductPvd:        0,
      deductOther:      0,
    }
  })

  const values = watch()

  // Load settings & year income
  useEffect(() => {
    const yr = taxYear.toString()
    Promise.all([
      receiptsApi.summary(taxYear),
      taxApi.getSettings(taxYear).catch(() => null),
    ]).then(([summary, settings]) => {
      setGrossFromDb(summary.thisYear)
      if (settings) {
        setIncomeType(settings.incomeType as IncomeType)
        reset({
          extraIncome:     settings.extraIncome,
          incomeType:      settings.incomeType as IncomeType,
          deductPersonal:  settings.deductPersonal,
          deductSpouse:    settings.deductSpouse,
          deductChild:     settings.deductChild,
          deductParent:    settings.deductParent,
          deductLifeIns:   settings.deductLifeIns,
          deductHealthIns: settings.deductHealthIns,
          deductRmf:       settings.deductRmf,
          deductSsf:       settings.deductSsf,
          deductPvd:       settings.deductPvd,
          deductOther:     settings.deductOther,
        })
      }
    })
  }, [taxYear, reset])

  // Recalculate whenever values change
  useEffect(() => {
    setResult(calcLocally({ ...values, incomeType }, grossFromDb))
  }, [values, incomeType, grossFromDb])

  const saveSettings = async () => {
    setSaving(true)
    try {
      await taxApi.saveSettings({
        taxYear,
        incomeType,
        ...values,
      } as TaxSettings)
      show('บันทึกการตั้งค่าภาษีสำเร็จ ✓')
    } catch {
      show('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const summaryRows = result ? [
    { label: 'รายได้รวม',                  value: fmtTHB(result.grossIncome),      bold: false },
    { label: INCOME_TYPES.find(t => t.value === incomeType)?.deductLabel ?? 'หักค่าใช้จ่าย',
                                            value: `− ${fmtTHB(result.expenseDeduction)}`, bold: false },
    { label: 'รายได้หลังหักค่าใช้จ่าย',   value: fmtTHB(result.netAfterExpense),  bold: false },
    { label: 'ค่าลดหย่อนรวม',             value: `− ${fmtTHB(result.totalDeductions)}`, bold: false },
    { label: 'เงินได้สุทธิ',               value: fmtTHB(result.netIncome),        bold: true  },
  ] : []

  return (
    <div className="p-6">
      <PageHeader title="คำนวณภาษีเงินได้บุคคลธรรมดา">
        <div className="flex items-center gap-2">
          <select
            value={taxYear}
            onChange={e => setTaxYear(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map(y =>
              <option key={y} value={y}>ปีภาษี {y}</option>
            )}
          </select>
          <Button size="sm" loading={saving} onClick={saveSettings}>บันทึกค่าลดหย่อน</Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-5">
        {/* LEFT: Inputs */}
        <div className="space-y-4">

          {/* Income type */}
          <Card>
            <p className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-3">
              <Landmark size={15} className="text-teal-700" /> ลักษณะการทำงาน
            </p>
            <div className="space-y-2">
              {INCOME_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setIncomeType(t.value)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                    incomeType === t.value
                      ? 'border-teal-600 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className={`text-xs font-medium ${incomeType === t.value ? 'text-teal-700' : 'text-gray-700'}`}>
                    {t.title}
                  </p>
                  <p className={`text-xs mt-0.5 ${incomeType === t.value ? 'text-teal-600' : 'text-gray-400'}`}>
                    {t.sub}
                  </p>
                </button>
              ))}
            </div>
            <div className="mt-3 p-2.5 bg-gray-50 rounded-lg text-xs text-gray-500 flex gap-1.5">
              <Info size={12} className="flex-shrink-0 mt-0.5 text-teal-600" />
              {INCOME_TYPES.find(t => t.value === incomeType)?.deductLabel}
            </div>
          </Card>

          {/* Income */}
          <Card>
            <p className="text-sm font-medium text-gray-900 mb-3">รายได้</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">
                  รายได้จากระบบ (ปี {taxYear})
                </label>
                <div className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600">
                  ฿{grossFromDb.toLocaleString()}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">
                  รายได้เพิ่มเติม (นอกระบบ)
                </label>
                <input
                  type="number"
                  {...register('extraIncome')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
            </div>
          </Card>

          {/* Deductions */}
          <Card>
            <p className="text-sm font-medium text-gray-900 mb-3">ค่าลดหย่อน</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'deductPersonal',  label: 'ส่วนตัว (60,000)', note: '' },
                { name: 'deductSpouse',    label: 'คู่สมรส', note: '60,000' },
                { name: 'deductChild',     label: 'บุตร', note: 'คนละ 30,000' },
                { name: 'deductParent',    label: 'บิดามารดา', note: 'คนละ 30,000' },
                { name: 'deductLifeIns',   label: 'เบี้ยประกันชีวิต', note: 'ไม่เกิน 100,000' },
                { name: 'deductHealthIns', label: 'ประกันสุขภาพ', note: 'ไม่เกิน 25,000' },
                { name: 'deductRmf',       label: 'RMF', note: 'ไม่เกิน 30% รายได้' },
                { name: 'deductSsf',       label: 'SSF', note: 'ไม่เกิน 200,000' },
                { name: 'deductPvd',       label: 'กองทุนสำรองเลี้ยงชีพ', note: 'ไม่เกิน 500,000' },
                { name: 'deductOther',     label: 'อื่นๆ', note: '' },
              ].map(f => (
                <div key={f.name}>
                  <label className="text-xs text-gray-500 block mb-1">
                    {f.label}
                    {f.note && <span className="text-gray-400 ml-1">({f.note})</span>}
                  </label>
                  <input
                    type="number"
                    {...register(f.name as any)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* RIGHT: Results */}
        <div className="space-y-4">

          {/* Calculation summary */}
          <Card>
            <p className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-3">
              <Calculator size={15} className="text-teal-700" /> สรุปการคำนวณ
            </p>
            <div className="divide-y divide-gray-50">
              {summaryRows.map((row, i) => (
                <div key={i} className={`flex justify-between py-2 text-sm ${
                  row.bold ? 'font-medium text-gray-900' : 'text-gray-600'
                } ${i === summaryRows.length - 1 ? 'bg-teal-50 rounded-lg px-3 -mx-3' : ''}`}>
                  <span>{row.label}</span>
                  <span>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Final tax */}
            <div className="mt-4 bg-amber-50 rounded-xl p-4">
              <p className="text-xs text-amber-700 mb-1">ประมาณการภาษีที่ต้องชำระทั้งปี</p>
              <p className="text-3xl font-medium text-amber-900">
                {result ? fmtTHB(result.tax) : '—'}
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Effective rate: {result ? `${result.effectiveRate.toFixed(2)}%` : '—'}
              </p>
            </div>
          </Card>

          {/* Tax brackets */}
          <Card>
            <p className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-3">
              <TrendingUp size={15} className="text-teal-700" /> อัตราภาษีก้าวหน้า
            </p>
            <div className="space-y-1">
              {TAX_BRACKETS.map((b, i) => {
                const isActive = result && result.bracket === i && result.netIncome > 0
                const maxLabel = b.max === Infinity ? 'ขึ้นไป' : `${b.max.toLocaleString()}`
                return (
                  <div
                    key={i}
                    className={`flex justify-between px-3 py-2 rounded-lg text-xs ${
                      isActive ? 'bg-teal-100 font-medium text-teal-700' : 'text-gray-500'
                    }`}
                  >
                    <span>{b.min.toLocaleString()} – {maxLabel}</span>
                    <span>{b.rate === 0 ? 'ยกเว้น' : `${b.rate * 100}%`}</span>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Filing schedule */}
          <Card>
            <p className="text-sm font-medium text-gray-900 mb-3">กำหนดการยื่นภาษี</p>
            <div className="space-y-2">
              {incomeType === '40-6' ? (
                <>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-700">ภ.ง.ด.94 — ภาษีครึ่งปี</p>
                    <p className="text-xs text-teal-700 mt-0.5">กรกฎาคม – กันยายน ทุกปี</p>
                    <p className="text-xs text-gray-500">รายได้ มกราคม–มิถุนายน</p>
                    {result && result.halfYearTax > 0 && (
                      <p className="text-xs font-medium text-amber-700 mt-1">
                        ประมาณการ: {fmtTHB(result.halfYearTax)}
                      </p>
                    )}
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-700">ภ.ง.ด.90 — ภาษีสิ้นปี</p>
                    <p className="text-xs text-teal-700 mt-0.5">มกราคม – มีนาคม ปีถัดไป</p>
                    <p className="text-xs text-gray-500">รายได้รวมทั้งปี หักภาษีครึ่งปีที่จ่ายแล้ว</p>
                  </div>
                </>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-700">ภ.ง.ด.91 / ภ.ง.ด.90</p>
                  <p className="text-xs text-teal-700 mt-0.5">มกราคม – มีนาคม ปีถัดไป</p>
                  <p className="text-xs text-gray-500">
                    ภ.ง.ด.91 สำหรับรายได้ประเภทเดียว, ภ.ง.ด.90 กรณีมีหลายประเภท
                  </p>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              * ตัวเลขนี้เป็นการประมาณการเบื้องต้นเท่านั้น แนะนำให้ปรึกษานักบัญชีหรือสรรพากร
            </p>
          </Card>
        </div>
      </div>

      {message && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-teal-900 text-white
                        text-sm px-5 py-2.5 rounded-lg shadow-lg z-50 pointer-events-none">
          {message}
        </div>
      )}
    </div>
  )
}
