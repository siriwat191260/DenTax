import { Badge } from '@/components/ui'
import { INCOME_TYPE_LABELS } from '@/types'
import type { IncomeType } from '@/types'

const colorMap: Record<IncomeType, 'blue' | 'green' | 'teal'> = {
  '40-1': 'blue',
  '40-2': 'green',
  '40-6': 'teal',
}

export function IncomeTypeBadge({ type }: { type: string }) {
  const t = type as IncomeType
  return (
    <Badge color={colorMap[t] ?? 'gray'}>
      {INCOME_TYPE_LABELS[t] ?? type}
    </Badge>
  )
}
