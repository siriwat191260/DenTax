'use client'

import { useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Plus, Trash2, Save } from 'lucide-react'
import { Button, Input, Select } from '@/components/ui'
import { CATEGORIES, PAYMENT_METHODS, INCOME_TYPE_LABELS } from '@/types'
import { receiptsApi, type Receipt } from '@/lib/api'
import type { IncomeType } from '@/types'

const schema = z.object({
  date:       z.string().min(1),
  incomeType: z.enum(['40-1', '40-2', '40-6']),
  category:   z.string(),
  patient:    z.string().optional(),
  payment:    z.string(),
  note:       z.string().optional(),
  total:      z.coerce.number().min(0),
  items:      z.array(z.object({ name: z.string(), amount: z.coerce.number() })),
})

type FormValues = z.infer<typeof schema>

interface Props {
  receipt: Receipt
  onClose: () => void
  onSaved: () => void
}

export function ReceiptFormModal({ receipt, onClose, onSaved }: Props) {
  const { register, control, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        date:       receipt.date,
        incomeType: receipt.incomeType as IncomeType,
        category:   receipt.category,
        patient:    receipt.patient ?? '',
        payment:    receipt.payment,
        note:       receipt.note ?? '',
        total:      receipt.total,
        items:      receipt.items.length ? receipt.items : [{ name: '', amount: 0 }],
      },
    })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = watch('items')

  const recalcTotal = () => {
    const sum = items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0)
    setValue('total', sum)
  }

  const onSubmit = async (values: FormValues) => {
    await receiptsApi.update(receipt.id, values as any)
    onSaved()
    onClose()
  }

  const incomeTypeOptions = (Object.keys(INCOME_TYPE_LABELS) as IncomeType[]).map(k => ({
    value: k, label: INCOME_TYPE_LABELS[k],
  }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-medium text-gray-900">แก้ไขรายการ</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="วันที่" type="date" error={errors.date?.message} {...register('date')} />
            <Select
              label="ประเภทรายได้"
              options={incomeTypeOptions}
              {...register('incomeType')}
            />
            <Select
              label="ประเภทบริการ"
              options={CATEGORIES.map(c => ({ value: c, label: c }))}
              {...register('category')}
            />
            <Input label="ชื่อผู้ป่วย" placeholder="ชื่อผู้ป่วย" {...register('patient')} />
            <Select
              label="ช่องทางรับชำระ"
              options={PAYMENT_METHODS.map(p => ({ value: p, label: p }))}
              {...register('payment')}
            />
            <Input label="หมายเหตุ" placeholder="หมายเหตุ" {...register('note')} />
          </div>

          {/* Items */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide block mb-2">รายการบริการ</label>
            <div className="space-y-2">
              {fields.map((field, i) => (
                <div key={field.id} className="flex gap-2">
                  <input
                    {...register(`items.${i}.name`)}
                    placeholder="รายการ"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                  <input
                    {...register(`items.${i}.amount`, { onChange: recalcTotal })}
                    type="number"
                    placeholder="0"
                    step="0.01"
                    className="w-28 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                  <button type="button" onClick={() => { remove(i); recalcTotal() }} className="text-gray-400 hover:text-red-500 px-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => append({ name: '', amount: 0 })}
              className="mt-2 text-xs text-teal-700 flex items-center gap-1 hover:underline">
              <Plus size={12} /> เพิ่มรายการ
            </button>
          </div>

          {/* Total */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500 uppercase tracking-wide whitespace-nowrap">ยอดรวม (บาท)</label>
            <input
              {...register('total')}
              type="number"
              step="0.01"
              className="w-40 border border-gray-200 rounded-lg px-3 py-2 text-sm text-right font-medium focus:outline-none focus:ring-2 focus:ring-teal-400 ml-auto"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" type="button" onClick={onClose} className="flex-1">ยกเลิก</Button>
            <Button type="submit" loading={isSubmitting} className="flex-1">
              <Save size={14} /> บันทึก
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
