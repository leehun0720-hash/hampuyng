/**
 * 공통 UI 조각
 * 외부 컴포넌트 라이브러리를 쓰지 않고 최소한으로 직접 정의한다.
 */
import Link from 'next/link'
import type { ReactNode } from 'react'

type Tone = 'neutral' | 'ok' | 'warn' | 'bad' | 'gov'

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-700 border-ink-200',
  ok: 'bg-ok-50 text-ok-600 border-ok-500/25',
  warn: 'bg-warn-50 text-warn-600 border-warn-500/25',
  bad: 'bg-bad-50 text-bad-600 border-bad-500/25',
  gov: 'bg-gov-50 text-gov-700 border-gov-300/50',
}

export function Badge({
  children,
  tone = 'neutral',
  title,
}: {
  children: ReactNode
  tone?: Tone
  title?: string
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium leading-tight ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  )
}

export function Card({
  title,
  desc,
  action,
  children,
  className = '',
}: {
  title?: ReactNode
  desc?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-lg border border-ink-200 bg-white ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-3.5">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-bold text-ink-900">{title}</h2>}
            {desc && <p className="mt-1 text-xs leading-relaxed text-ink-500">{desc}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

export function PageHeader({
  eyebrow,
  title,
  desc,
  action,
}: {
  eyebrow?: string
  title: string
  desc?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-ink-200 pb-5">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[11px] font-semibold tracking-wide text-gov-500">{eyebrow}</p>}
        <h1 className="text-xl font-bold tracking-tight text-ink-900">{title}</h1>
        {desc && <div className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-500">{desc}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function Progress({ value, tone = 'gov' }: { value: number; tone?: Tone }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  const bar =
    tone === 'ok' ? 'bg-ok-500' : tone === 'warn' ? 'bg-warn-500' : tone === 'bad' ? 'bg-bad-500' : 'bg-gov-500'
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
      <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Empty({ title, desc, cta }: { title: string; desc: string; cta?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-ink-300 bg-white px-6 py-12 text-center">
      <p className="text-sm font-semibold text-ink-700">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-ink-500">{desc}</p>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  )
}

export function Notice({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  const cls =
    tone === 'ok'
      ? 'border-ok-500/30 bg-ok-50 text-ok-600'
      : tone === 'warn'
        ? 'border-warn-500/30 bg-warn-50 text-warn-600'
        : tone === 'bad'
          ? 'border-bad-500/30 bg-bad-50 text-bad-600'
          : 'border-gov-200 bg-gov-50 text-gov-700'
  return <div className={`rounded border px-3.5 py-2.5 text-xs leading-relaxed ${cls}`}>{children}</div>
}

export function LinkButton({
  href,
  children,
  variant = 'primary',
}: {
  href: string
  children: ReactNode
  variant?: 'primary' | 'ghost'
}) {
  const cls =
    variant === 'primary'
      ? 'bg-gov-600 text-white hover:bg-gov-700'
      : 'border border-ink-300 bg-white text-ink-700 hover:bg-ink-50'
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition ${cls}`}
    >
      {children}
    </Link>
  )
}

export const VERIFICATION_BADGE = {
  verified: { label: '확인됨', tone: 'ok' as Tone },
  'needs-check': { label: '확인 필요', tone: 'warn' as Tone },
  assumption: { label: '가정치', tone: 'bad' as Tone },
}
