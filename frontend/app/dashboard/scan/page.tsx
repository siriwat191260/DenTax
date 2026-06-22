'use client'

import { useState, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Sparkles, Upload, Plus, Trash2, Save, Loader2 } from 'lucide-react'
import { scanApi, receiptsApi, type CreateReceiptDto } from '@/lib/api'
import { CATEGORIES, PAYMENT_METHODS, INCOME_TYPE_LABELS } from '@/types'
import type { IncomeType } from '@/types'

const schema = z.object({
  date:       z.string().min(1, 'กรุณาเลือกวันที่'),
  incomeType: z.enum(['40-1', '40-2', '40-6']),
  category:   z.string().min(1),
  patient:    z.string().optional(),
  payment:    z.string().min(1),
  note:       z.string().optional(),
  total:      z.coerce.number().min(1, 'กรุณากรอกจำนวนเงิน'),
  items:      z.array(z.object({ name: z.string(), amount: z.coerce.number() })),
})

type FormValues = z.infer<typeof schema>

export default function ScanPage() {
  const [file, setFile]         = useState<File | null>(null)
  const [preview, setPreview]   = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [scanned, setScanned]   = useState(false)
  const [toast, setToast]       = useState<string | null>(null)

  const { register, control, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        date:       new Date().toISOString().split('T')[0],
        incomeType: '40-6',
        category:   CATEGORIES[0],
        payment:    'เงินสด',
        items:      [{ name: '', amount: 0 }],
        total:      0,
      },
    })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = watch('items')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const handleFile = useCallback((f: File) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setScanned(false)
  }, [])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('image/')) handleFile(f)
  }

  const handleScan = async () => {
    if (!file) return
    setScanning(true)
    try {
      const result = await scanApi.scanImage(file)
      if (result.date) setValue('date', result.date)
      setValue('patient',  result.patient || '')
      setValue('category', result.category || CATEGORIES[0])
      setValue('payment',  result.payment  || 'เงินสด')
      setValue('note',     result.note     || '')
      setValue('total',    result.total    || 0)
      setValue('items',    result.items?.length ? result.items : [{ name: 'บริการทันตกรรม', amount: result.total }])
      setScanned(true)
      showToast('AI อ่านใบเสร็จสำเร็จ ✓')
    } catch {
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setScanning(false)
    }
  }

  const onSubmit = async (values: FormValues) => {
    setSaving(true)
    try {
      await receiptsApi.create(values as CreateReceiptDto)
      showToast('บันทึกสำเร็จ ✓')
      reset()
      setFile(null)
      setPreview(null)
      setScanned(false)
    } catch {
      showToast('บันทึกไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setSaving(false)
    }
  }

  const recalcTotal = () => {
    const sum = items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0)
    setValue('total', sum)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-lg font-medium text-gray-900 mb-6">สแกนใบเสร็จรับเงิน</h1>

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className="relative border-2 border-dashed border-gray-200 rounded-xl p-8 text-center
                   hover:border-teal-400 transition-colors cursor-pointer bg-white"
      >
        <input
          type="file"
          accept="image/*"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        <Upload className="mx-auto mb-3 text-gray-300" size={36} />
        <p className="text-sm text-gray-500">คลิกหรือลากไฟล์รูปภาพมาวางที่นี่</p>
        <p className="text-xs text-gray-400 mt-1">รองรับ JPG, PNG, WEBP</p>
      </div>

      {/* Preview */}
      {preview && (
        <div className="mt-3 rounded-xl overflow-hidden bg-black flex justify-center max-h-48">
          <img src={preview} alt="ใบเสร็จ" className="max-h-48 object-contain" />
        </div>
      )}

      {/* Scan button */}
      <button
        onClick={handleScan}
        disabled={!file || scanning}
        className="btn-primary w-full mt-3 justify-center"
      >
        {scanning ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {scanning ? 'กำลังอ่านใบเสร็จ...' : 'ให้ AI อ่านใบเสร็จ'}
      </button>

      {/* Review form */}
      {(scanned || file) && (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <p className="text-sm font-medium text-gray-900">ตรวจสอบและแก้ไขก่อนบันทึก</p>
              {scanned && <span className="badge badge-teal">AI สแกน</span>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">วันที่</label>
                <input type="date" {...register('date')} className="input" />
                {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
              </div>

              <div>
                <label className="label">ประเภทรายได้ (มาตรา)</label>
                <select {...register('incomeType')} className="input">
                  {(Object.keys(INCOME_TYPE_LABELS) as IncomeType[]).map(k => (
                    <option key={k} value={k}>{INCOME_TYPE_LABELS[k]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">ประเภทบริการ</label>
                <select {...register('category')} className="input">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="label">ชื่อผู้ป่วย / ผู้จ่าย</label>
                <input {...register('patient')} className="input" placeholder="ชื่อผู้ป่วย" />
              </div>

              <div>
                <label className="label">ช่องทางรับชำระ</label>
                <select {...register('payment')} className="input">
                  {PAYMENT_METHODS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label className="label">หมายเหตุ</label>
                <input {...register('note')} className="input" placeholder="หมายเหตุเพิ่มเติม" />
              </div>
            </div>

            {/* Items */}
            <div className="mt-4">
              <label className="label">รายการบริการ</label>
              <div className="space-y-2">
                {fields.map((field, i) => (
                  <div key={field.id} className="flex gap-2">
                    <input
                      {...register(`items.${i}.name`)}
                      className="input flex-1"
                      placeholder="รายการ"
                    />
                    <input
                      {...register(`items.${i}.amount`, { onChange: recalcTotal })}
                      type="number"
                      className="input w-32 text-right"
                      step="0.01"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => { remove(i); recalcTotal() }}
                      className="text-gray-400 hover:text-red-500 transition-colors px-1"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => append({ name: '', amount: 0 })}
                className="mt-2 text-xs text-teal-700 flex items-center gap-1 hover:underline"
              >
                <Plus size={13} /> เพิ่มรายการ
              </button>
            </div>

            {/* Total */}
            <div className="mt-4 flex items-center gap-3">
              <label className="label whitespace-nowrap">ยอดรวม (บาท)</label>
              <input
                {...register('total')}
                type="number"
                step="0.01"
                className="input w-40 text-right font-medium"
              />
              {errors.total && <p className="text-xs text-red-500">{errors.total.message}</p>}
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
          </button>
        </form>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-teal-900 text-white
                        text-sm px-4 py-2 rounded-lg shadow-lg z-50 pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  )
}
