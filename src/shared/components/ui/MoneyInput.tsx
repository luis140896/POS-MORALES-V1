import { useState, useEffect, useRef } from 'react'

interface MoneyInputProps {
  label?: string
  value: number | ''
  onChange: (value: number | '') => void
  required?: boolean
  min?: number
  disabled?: boolean
  placeholder?: string
  className?: string
}

const formatMoney = (num: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

const parseMoneyString = (str: string): number => {
  const cleaned = str.replace(/[^0-9]/g, '')
  return cleaned ? parseInt(cleaned, 10) : 0
}

const MoneyInput = ({
  label,
  value,
  onChange,
  required,
  min,
  disabled,
  placeholder = '$0',
  className = '',
}: MoneyInputProps) => {
  const [displayValue, setDisplayValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (value === '' || value === 0) {
      setDisplayValue('')
    } else {
      setDisplayValue(formatMoney(value))
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const numeric = parseMoneyString(raw)

    if (numeric === 0) {
      setDisplayValue('')
      onChange('')
    } else {
      setDisplayValue(formatMoney(numeric))
      onChange(numeric)
    }
  }

  const handleFocus = () => {
    if (value && value !== 0) {
      setDisplayValue(String(value))
    }
  }

  const handleBlur = () => {
    if (value === '' || value === 0) {
      setDisplayValue('')
    } else {
      setDisplayValue(formatMoney(value as number))
    }
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && '*'}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        min={min}
        className="input-field"
      />
    </div>
  )
}

export default MoneyInput
export { formatMoney, parseMoneyString }
