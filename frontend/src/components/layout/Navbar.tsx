import { Menu, X } from 'lucide-react'
import { useState } from 'react'

const links = [
  { href: '#generator', label: 'Generator' },
  { href: '#gallery', label: 'Gallery' },
  { href: '#about', label: 'About' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  const github = import.meta.env.VITE_GITHUB_URL

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-background/75 backdrop-blur-xl">
      <a
        href="#generator"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-background"
      >
        Skip to generator
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-3 text-ink">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5">
            <svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden="true">
              <path d="M16 3 28 10v12L16 29 4 22V10L16 3Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M16 16 28 10M16 16 4 10M16 16v13" fill="none" stroke="#a5b4fc" strokeWidth="1.6" />
            </svg>
          </span>
          <span className="text-sm font-semibold tracking-wide">3DForge AI</span>
        </a>
        <nav className="hidden items-center gap-8 text-sm text-muted md:flex" aria-label="Primary">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="transition hover:text-ink">
              {link.label}
            </a>
          ))}
          {github ? (
            <a href={github} className="transition hover:text-ink" target="_blank" rel="noreferrer">
              GitHub
            </a>
          ) : null}
        </nav>
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-full border border-border md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {open ? (
        <nav id="mobile-nav" className="flex flex-col gap-1 border-t border-white/5 px-4 py-3 md:hidden" aria-label="Mobile">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="rounded-xl px-3 py-3 text-sm text-ink" onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          {github ? (
            <a href={github} className="rounded-xl px-3 py-3 text-sm text-ink" target="_blank" rel="noreferrer">
              GitHub
            </a>
          ) : null}
        </nav>
      ) : null}
    </header>
  )
}
