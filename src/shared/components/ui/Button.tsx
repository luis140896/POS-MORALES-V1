import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  children: ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, children, className, disabled, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'
    
    const variantClasses = {
      primary: 'bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-2xl shadow-soft hover:shadow-hover hover:from-primary-700 hover:to-primary-800',
      secondary: 'bg-white text-primary-700 rounded-2xl border-2 border-primary-200 shadow-soft hover:bg-primary-50 hover:border-primary-300 hover:shadow-hover',
      ghost: 'text-primary-600 rounded-xl hover:bg-primary-100',
      danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl shadow-soft hover:from-red-600 hover:to-red-700 hover:shadow-hover',
    }

    const sizeClasses = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    }

    return (
      <button
        ref={ref}
        className={clsx(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Cargando...
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
