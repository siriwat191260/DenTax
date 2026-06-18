import { forwardRef } from 'react'
import clsx from 'clsx'
import { Loader2 } from 'lucide-react'

// ── Button ────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
        variant === 'primary' && 'bg-teal-900 text-white hover:opacity-90',
        variant === 'outline' && 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
        variant === 'ghost'   && 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
        variant === 'danger'  && 'text-red-500 hover:bg-red-50',
        className,
      )}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  )
)
Button.displayName = 'Button'

// ── Input ─────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs text-gray-500 uppercase tracking-wide">{label}</label>}
      <input
        ref={ref}
        className={clsx(
          'w-full border rounded-lg px-3 py-2 text-sm bg-white',
          'focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent',
          error ? 'border-red-400' : 'border-gray-200',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'

// ── Select ────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs text-gray-500 uppercase tracking-wide">{label}</label>}
      <select
        ref={ref}
        className={clsx(
          'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white',
          'focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent',
          className,
        )}
        {...props}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
)
Select.displayName = 'Select'

// ── Card ──────────────────────────────────────────────────────
export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('bg-white border border-gray-100 rounded-xl p-5', className)}>
      {children}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────
const badgeColors = {
  teal:   'bg-teal-50 text-teal-700',
  blue:   'bg-blue-50 text-blue-700',
  green:  'bg-green-50 text-green-700',
  amber:  'bg-amber-50 text-amber-700',
  gray:   'bg-gray-100 text-gray-600',
  red:    'bg-red-50 text-red-600',
}

export function Badge({
  children,
  color = 'gray',
}: {
  children: React.ReactNode
  color?: keyof typeof badgeColors
}) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', badgeColors[color])}>
      {children}
    </span>
  )
}

// ── Metric Card ───────────────────────────────────────────────
export function MetricCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string
  value: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div className={clsx(
      'rounded-xl p-4 border',
      highlight ? 'bg-teal-900 border-teal-800 text-white' : 'bg-white border-gray-100'
    )}>
      <p className={clsx('text-xs mb-1', highlight ? 'text-teal-200' : 'text-gray-500')}>{label}</p>
      <p className={clsx('text-xl font-medium', highlight ? 'text-white' : 'text-gray-900')}>{value}</p>
      {sub && <p className={clsx('text-xs mt-1', highlight ? 'text-teal-300' : 'text-teal-600')}>{sub}</p>}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────
export function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
      <div className="text-4xl">{icon}</div>
      <p className="text-sm">{message}</p>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────
export function Toast({ message, onHide }: { message: string; onHide: () => void }) {
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-teal-900 text-white
                 text-sm px-5 py-2.5 rounded-lg shadow-lg z-50 pointer-events-none
                 animate-fade-in"
      onAnimationEnd={onHide}
    >
      {message}
    </div>
  )
}

// ── Page Header ───────────────────────────────────────────────
export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-lg font-medium text-gray-900">{title}</h1>
      {children}
    </div>
  )
}
