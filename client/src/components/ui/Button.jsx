import { Loader2 } from 'lucide-react'

const variants = {
  primary:
    'bg-gradient-to-r from-[#0057dc] to-[#0041a8] text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 btn-glow hover:cursor-pointer',
  secondary:
    'bg-transparent text-white border border-blue-500/40 hover:bg-blue-500/10 hover:border-blue-400/60 hover:cursor-pointer',
  danger:
    'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 ',
  ghost:
    'bg-transparent text-slate-300 hover:text-white hover:bg-white/5',
  accent:
    'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-7 py-3.5 text-base rounded-xl gap-2.5',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        relative inline-flex items-center justify-center font-semibold
        transition-all duration-300 ease-out
        active:scale-[0.97]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <Loader2 size={size === 'sm' ? 14 : 18} className="animate-spin" />
      )}
      {children}
    </button>
  )
}
