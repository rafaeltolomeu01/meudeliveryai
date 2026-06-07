import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

const Input = forwardRef(function Input({
  label,
  error,
  hint,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  type = 'text',
  placeholder,
  className = '',
  containerClassName = '',
  required = false,
  ...props
}, ref) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label className="text-sm font-medium text-[#d4bfee]">
          {label}
          {required && <span className="text-[#FF6B35] ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {LeftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5880] pointer-events-none">
            <LeftIcon size={16} />
          </div>
        )}
        <input
          ref={ref}
          type={inputType}
          placeholder={placeholder}
          className={[
            'w-full bg-white/5 border rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#6b5880]',
            'transition-all duration-200',
            'focus:outline-none focus:border-[#FF6B35]/60 focus:bg-white/8 focus:ring-2 focus:ring-[#FF6B35]/10',
            error ? 'border-red-500/50 bg-red-500/5' : 'border-white/10 hover:border-white/20',
            LeftIcon ? 'pl-10' : '',
            isPassword || RightIcon ? 'pr-10' : '',
            className,
          ].join(' ')}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b5880] hover:text-[#a991c7] transition-colors"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
        {!isPassword && RightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b5880] pointer-events-none">
            <RightIcon size={16} />
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-[#6b5880]">{hint}</p>
      )}
    </div>
  )
})

export default Input
