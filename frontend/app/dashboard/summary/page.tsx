'use client'

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { receiptsApi } from '@/lib/api'
import { MetricCard, Card, PageHeader, EmptyState } from '@/components/ui'

const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const PIE_COLORS = ['#0D5C63','#1D9E75','#34D399','#6EE7B7','#A7F3D0','#D1FAE5','#F59E0B','#FCD34D']

interface Summary {
  today: number; thisMonth: number; thisYear: number
  countToday: number; countMonth: number; countYear: number
  byMonth: { month: number; total: number }[]
  byCategory: { category: string; total: number }[]
}

function fmt(n: number) {
  if (n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `฿${(n / 1_000).toFixed(0)}K`
  return `฿${n.toLocaleString()}`
}

// Custom tooltip for bar chart
function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      <p className="text-teal-700">฿{Number(payload[0].value).toLocaleString()}</p>
    </div>
  )
}

export default function SummaryPage() {
  const [summary, setSummary]  = useState<Summary | null>(null)
  const [year, setYear]        = useState(new Date().getFullYear())
  const [loading, setLoading]  = useState(true)

  useEffect(() => {
    setLoading(true)
    receiptsApi.summary(year)
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [year])

  const monthData = MONTHS.map((name, i) => ({
    name,
    total: summary?.byMonth.find(m => m.month === i + 1)?.total ?? 0,
    isCurrent: i === new Date().getMonth() && year === new Date().getFullYear(),
  }))

  const pieData = summary?.byCategory
    .filter(c => c.total > 0)
    .slice(0, 8) ?? []

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 4 }, (_, i) => currentYear - i)

  if (loading) return (
    <div className="p-6 flex justify-center pt-20">
      <div className="w-7 h-7 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6">
      <PageHeader title="สรุปรายได้">
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </PageHeader>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <MetricCard
          label="วันนี้"
          value={fmt(summary?.today ?? 0)}
          sub={`${summary?.countToday ?? 0} รายการ`}
        />
        <MetricCard
          label="เดือนนี้"
          value={fmt(summary?.thisMonth ?? 0)}
          sub={`${summary?.countMonth ?? 0} รายการ`}
        />
        <MetricCard
          label={`ทั้งปี ${year}`}
          value={fmt(summary?.thisYear ?? 0)}
          sub={`${summary?.countYear ?? 0} รายการ`}
          highlight
        />
      </div>

      {/* Monthly bar chart */}
      <Card className="mb-5">
        <p className="text-sm font-medium text-gray-900 mb-4">รายได้รายเดือน — ปี {year}</p>
        {(summary?.thisYear ?? 0) === 0 ? (
          <EmptyState icon="📊" message="ยังไม่มีข้อมูลปีนี้" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={v => v === 0 ? '' : `${(v/1000).toFixed(0)}K`}
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                axisLine={false} tickLine={false} width={36}
              />
              <Tooltip content={<BarTooltip />} />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {monthData.map((entry, i) => (
                  <Cell key={i} fill={entry.isCurrent ? '#0D5C63' : '#1D9E75'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Category breakdown */}
      <div className="grid grid-cols-2 gap-5">
        {/* Pie chart */}
        <Card>
          <p className="text-sm font-medium text-gray-900 mb-4">สัดส่วนตามประเภทบริการ</p>
          {pieData.length === 0 ? (
            <EmptyState icon="🥧" message="ยังไม่มีข้อมูล" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="total"
                  nameKey="category"
                  cx="50%" cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [`฿${v.toLocaleString()}`, 'รายได้']}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
                />
                <Legend
                  formatter={(v) => <span style={{ fontSize: 11, color: '#6B7280' }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Table breakdown */}
        <Card>
          <p className="text-sm font-medium text-gray-900 mb-4">ตารางรายได้ตามประเภท</p>
          {pieData.length === 0 ? (
            <EmptyState icon="📋" message="ยังไม่มีข้อมูล" />
          ) : (
            <div className="space-y-3">
              {pieData.map((cat, i) => {
                const pct = summary?.thisYear
                  ? Math.round((cat.total / summary.thisYear) * 100)
                  : 0
                return (
                  <div key={cat.category}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-600 truncate max-w-[60%]">{cat.category}</span>
                      <span className="text-xs text-gray-500">฿{cat.total.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Income type breakdown */}
      <Card className="mt-5">
        <p className="text-sm font-medium text-gray-900 mb-4">รายได้แยกตามมาตรา (ปี {year})</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { key: '40-1', label: 'ม.40(1)\nเงินเดือน',   color: '#3B82F6' },
            { key: '40-2', label: 'ม.40(2)\nรับจ็อบ',      color: '#22C55E' },
            { key: '40-6', label: 'ม.40(6)\nคลินิกส่วนตัว', color: '#0D5C63' },
          ].map(type => {
            // We don't have per-type breakdown from summary API, so show total for now
            // In production, extend the summary endpoint to include byIncomeType
            return (
              <div key={type.key} className="text-center p-3 bg-gray-50 rounded-xl">
                <div
                  className="w-3 h-3 rounded-full mx-auto mb-2"
                  style={{ background: type.color }}
                />
                <p className="text-xs text-gray-500 whitespace-pre-line leading-tight">{type.label}</p>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          * ดูรายละเอียดแยกตามมาตราได้ที่หน้ารายการรายได้
        </p>
      </Card>
    </div>
  )
}
