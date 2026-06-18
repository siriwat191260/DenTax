'use client'

import { useState, useEffect, useCallback } from 'react'
import { receiptsApi, type Receipt } from '@/lib/api'

export function useReceipts(params?: { from?: string; to?: string }) {
  const [data, setData]       = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await receiptsApi.list(params)
      setData(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(params)])

  useEffect(() => { fetch() }, [fetch])

  const remove = async (id: string) => {
    await receiptsApi.delete(id)
    setData(prev => prev.filter(r => r.id !== id))
  }

  return { data, loading, error, refetch: fetch, remove }
}
