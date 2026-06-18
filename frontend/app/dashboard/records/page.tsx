'use client'

import { useState, useMemo } from 'react'
import { format, startOfDay, startOfMonth, startOfYear, endOfDay, endOfMonth, endOfYear } from 'date-fns'
import { th } from 'date-fns/locale'
import { Pencil, Trash2, Calendar, CreditCard } from 'lucide-react'
import { Button, Card, EmptyState, MetricCard, PageHeader } from '@/components/ui'
import { IncomeTypeBadge } from '@/components/ui/IncomeTypeBadge'
import { ReceiptFormModal } from '@/components/ui/ReceiptFormModal'
import { useReceipts } from '@/hooks/useReceipts'
import { useToast } from '@/hooks/useToast'
import type { Receipt } from '@/lib/api'
import type { ViewPeriod } from '@/types'

const tabs: { key: ViewPeriod; label: string }[] = [
  { key: 'day',   label: 'รายวัน'  },
  { key: 'month', label: 'รายเดือน' },
  { key: 'year',  label: 'รายปี'   },
]

export default function RecordsPage() {
  const [period, setPeriod]       = useState<ViewPeriod>('day')
  const [cursor, setCursor]       = useState(new Date())
  const [editing, setEditing]     = useState<Receipt | null>(null)
  const [deleting, setDeleting]   = useState<string | null>(null)
  const { message, show }         = useToast()

  // Compute date range from cursor + period
  const { from, to, label } = useMemo(() => {
    if (period === 'day') return {
      from:  format(startOfDay(cursor),  'yyyy-MM-dd'),
      to:    format(endOfDay(cursor),    'yyyy-MM-dd'),
      label: format(cursor, 'd MMMM yyyy', { locale: th }),
    }
    if (period === 'month') return {
      from:  format(startOfMonth(cursor), 'yyyy-MM-dd'),
      to:    format(endOfMonth(cursor),   'yyyy-MM-dd'),
      label: format(cursor, 'MMMM yyyy', { locale: th }),
    }
    return {
      from:  format(startOfYear(cursor),  'yyyy-MM-dd'),
      to:    format(endOfYear(cursor),    'yyyy-MM-dd'),
      label: format(cursor, 'yyyy'),
    }
  }, [period, cursor])

  const { data: receipts, loading, refetch, remove } = useReceipts({ from, to })

  const total = receipts.reduce((s, r) => s + r.total, 0)

  const navigate = (dir: -1 | 1) => {
    setCursor(prev => {
      const d = new Date(prev)
      if (period === 'day')   d.setDate(d.getDate() + dir)
      if (period === 'month') d.setMonth(d.getMonth() + dir)
      if (period === 'year')  d.setFullYear(d.getFullYear() + dir)
      return d
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบรายการนี้?')) return
    setDeleting(id)
    try {
      await remove(id)
      show('ลบรายการสำเร็จ')
    } catch {
      show('ลบไม่สำเร็จ')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="p-6">
      <PageHeader title="รายการรายได้" />

      {/* Period tabs */}
      <div className="flex gap-2 mb-5">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setPeriod(t.key); setCursor(new Date()) }}
            className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${
              period === t.key
                ? 'bg-teal-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Date navigator */}
      <div className="flex items-center justify-between mb-5 bg-white border border-gray-100 rounded-xl px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700 text-lg px-2">‹</button>
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <button onClick={() => navigate(1)}  className="text-gray-400 hover:text-gray-700 text-lg px-2">›</button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <MetricCard label="รายได้รวม"      value={`฿${total.toLocaleString()}`} highlight />
        <MetricCard label="จำนวนรายการ"   value={`${receipts.length} รายการ`} />
        <MetricCard label="เฉลี่ยต่อรายการ"
          value={receipts.length ? `฿${Math.round(total / receipts.length).toLocaleString()}` : '—'}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : receipts.length === 0 ? (
        <EmptyState icon="🧾" message="ไม่มีรายการในช่วงเวลานี้" />
      ) : (
        <div className="space-y-2">
          {receipts.map(r => (
            <Card key={r.id} className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Calendar size={11} /> {r.date}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <CreditCard size={11} /> {r.payment}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {r.category}{r.patient ? ` — ${r.patient}` : ''}
                </p>
                <div className="mt-1">
                  <IncomeTypeBadge type={r.incomeType} />
                </div>
                {r.note && <p className="text-xs text-gray-400 mt-1 truncate">{r.note}</p>}
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-base font-medium text-teal-700">
                  ฿{r.total.toLocaleString()}
                </p>
                {r.items.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">{r.items.length} รายการ</p>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <Button variant="ghost" size="sm" onClick={() => setEditing(r)} className="p-2">
                  <Pencil size={14} />
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(r.id)}
                  loading={deleting === r.id}
                  className="p-2"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <ReceiptFormModal
          receipt={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { refetch(); show('บันทึกสำเร็จ ✓') }}
        />
      )}

      {/* Toast */}
      {message && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-teal-900 text-white
                        text-sm px-5 py-2.5 rounded-lg shadow-lg z-50 pointer-events-none">
          {message}
        </div>
      )}
    </div>
  )
}
