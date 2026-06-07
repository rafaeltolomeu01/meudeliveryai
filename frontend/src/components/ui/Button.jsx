import { forwardRef } from 'react'

const variants = {
  primary: 'bg-[#FF6B35] hover:bg-[#e84e15] text-white shadow-[0_0_20px_rgba(255,107,53,0.3)] hover:shadow-[0_0_30px_rgba(255,107,53,0.5)]',
  secondary: 'bg-purple-700/40 hover:bg-purple-700/60 text-white border border-purple-500/30',
  danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30',
  ghost: 'bg-transparent hover:bg-white/5 text-[#a991c7] hover:text-white',
  outline: 'bg-transparent border border-[#FF6B35]/50 text-[#FF6B35] hover:bg-[#FF6B35]/10',
  success: 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3 text-base rounded-xl gap-2.5',
  xl: 'px-8 py-4 text-lg rounded-2xl gap-3',
}

const Button = forwardRef(function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  fullWidth = false,
  className = '',
  onClick,
  type = 'button',
  ...props
}, ref) {
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={[
        'inline-flex items-center justify-center font-medium transition-all duration-200',
        'btn-shimmer select-none',
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        fullWidth ? 'w-full' : '',
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95',
        className,
      ].join(' ')}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin-slow flex-shrink-0" />
      ) : LeftIcon ? (
        <LeftIcon size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} className="flex-shrink-0" />
      ) : null}
      {children && <span>{children}</span>}
      {!loading && RightIcon && (
        <RightIcon size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} className="flex-shrink-0" />
      )}
    </button>
  )
})

export default Button
