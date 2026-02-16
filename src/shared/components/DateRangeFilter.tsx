import { Calendar } from 'lucide-react'

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

interface DateRangeFilterProps {
  dateRange: { start: string; end: string }
  setDateRange: (range: { start: string; end: string }) => void
}

const DateRangeFilter = ({ dateRange, setDateRange }: DateRangeFilterProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Calendar size={16} className="text-gray-400 hidden sm:block flex-shrink-0" />
      <input
        type="date"
        className="input-field py-1.5 px-2 text-sm w-[130px]"
        value={dateRange.start}
        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
      />
      <span className="text-gray-400 text-sm">a</span>
      <input
        type="date"
        className="input-field py-1.5 px-2 text-sm w-[130px]"
        value={dateRange.end}
        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
      />
      <div className="flex gap-1.5">
        {[
          { label: 'Hoy', fn: () => { const d = toLocalDateStr(new Date()); setDateRange({ start: d, end: d }) } },
          { label: 'Semana', fn: () => { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 7); setDateRange({ start: toLocalDateStr(start), end: toLocalDateStr(end) }) } },
          { label: 'Mes', fn: () => { const now = new Date(); setDateRange({ start: toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 1)), end: toLocalDateStr(now) }) } },
          { label: 'Año', fn: () => { const now = new Date(); setDateRange({ start: toLocalDateStr(new Date(now.getFullYear(), 0, 1)), end: toLocalDateStr(now) }) } },
        ].map(({ label, fn }) => (
          <button key={label} onClick={fn} className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-primary-100 hover:text-primary-700 transition-colors">
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default DateRangeFilter
export { toLocalDateStr }
