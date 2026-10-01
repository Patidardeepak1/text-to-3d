import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost' | 'subtle'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-indigo-300 to-violet-300 text-zinc-950 shadow-[0_0_32px_rgba(139,147,255,0.35)] hover:brightness-110',
  ghost: 'border border-border bg-white/5 text-ink hover:bg-white/10',
  subtle: 'border border-border bg-card text-ink hover:border-white/20',
}

export function Button({ variant = 'subtle', className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
