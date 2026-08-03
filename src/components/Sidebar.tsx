'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { AiMode } from '@/lib/types'

const NAV = [
  { group: '현황', items: [{ href: '/', label: '대시보드', desc: '게이트① 현황' }] },
  {
    group: '제안서 작성',
    items: [
      { href: '/announcements', label: '공고문 분석', desc: '평가항목·근거 매칭' },
      { href: '/drafts', label: '초안 작성', desc: '표준 절차 7단계' },
      { href: '/review', label: '검토·감사 대응', desc: '확인목록·이력' },
    ],
  },
  {
    group: '기반',
    items: [
      { href: '/documents', label: '자료 창고', desc: 'AI 근거의 유일한 출처' },
      { href: '/prompts', label: 'AI 지시문 30종', desc: '복사해 쓰는 작업 지시' },
      { href: '/manual', label: '업무 매뉴얼', desc: '화면별 사용 방법' },
    ],
  },
  {
    group: '관리',
    items: [
      { href: '/metrics', label: '성과 측정·ROI', desc: '실측·절감률·회수' },
      { href: '/settings', label: '설정', desc: 'AI 모드·전제값' },
    ],
  },
]

const MODE_TONE: Record<AiMode, string> = {
  demo: 'bg-ink-100 text-ink-600 border-ink-300',
  anthropic: 'bg-gov-50 text-gov-700 border-gov-300',
  local: 'bg-ok-50 text-ok-600 border-ok-500/30',
}

const MODE_SHORT: Record<AiMode, string> = {
  demo: '데모 모드',
  anthropic: 'Claude API',
  local: '로컬 설치형',
}

/**
 * 좁은 화면용 상단 메뉴.
 * 사이드바를 그대로 두면 폭 240px를 차지해 본문이 눌린다. lg 미만에서는 이걸로 대체한다.
 */
export function MobileNav({ aiMode, docCount }: { aiMode: AiMode; docCount: number }) {
  const pathname = usePathname()
  const items = NAV.flatMap((s) => s.items)

  return (
    <div className="sticky top-0 z-30 border-b border-ink-200 bg-white lg:hidden">
      <div className="flex items-center justify-between gap-3 px-4 pt-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-wide text-gov-500">전라남도 함평군</p>
          <p className="truncate text-[13px] font-bold text-ink-900">국비 공모 제안서 작성 지원 시스템</p>
        </div>
        <Link
          href="/settings"
          className={`shrink-0 rounded border px-2 py-1 text-[10px] font-semibold ${MODE_TONE[aiMode]}`}
        >
          {MODE_SHORT[aiMode]}
        </Link>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-4 py-2.5">
        {items.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded px-2.5 py-1.5 text-[12px] font-semibold transition ${
                active ? 'bg-gov-600 text-white' : 'bg-ink-100 text-ink-700'
              }`}
            >
              {item.label}
              {item.href === '/documents' && (
                <span className={`ml-1 font-mono text-[10px] ${active ? 'text-gov-100' : 'text-ink-400'}`}>
                  {docCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export function Sidebar({ aiMode, docCount }: { aiMode: AiMode; docCount: number }) {
  const pathname = usePathname()

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-200 bg-white lg:flex">
      <div className="border-b border-ink-200 px-5 py-4">
        <p className="text-[11px] font-semibold tracking-wide text-gov-500">전라남도 함평군</p>
        <p className="mt-0.5 text-[15px] font-bold leading-snug text-ink-900">
          국비 공모 제안서
          <br />
          작성 지원 시스템
        </p>
        <p className="mt-1 text-[10px] text-ink-400">행정 AI 전환(AX) 1단계</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((section) => (
          <div key={section.group} className="mb-5">
            <p className="px-2 pb-1.5 text-[10px] font-bold tracking-wider text-ink-400">{section.group}</p>
            {section.items.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mb-0.5 block rounded px-2.5 py-2 transition ${
                    active ? 'bg-gov-600 text-white' : 'text-ink-700 hover:bg-ink-100'
                  }`}
                >
                  <span className="block text-[13px] font-semibold leading-tight">{item.label}</span>
                  <span className={`mt-0.5 block text-[10px] ${active ? 'text-gov-100' : 'text-ink-400'}`}>
                    {item.desc}
                  </span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t border-ink-200 px-4 py-3.5">
        <Link
          href="/settings"
          className={`flex items-center justify-between rounded border px-2.5 py-1.5 text-[11px] font-semibold ${MODE_TONE[aiMode]}`}
        >
          <span>{MODE_SHORT[aiMode]}</span>
          <span className="text-[10px] opacity-60">변경</span>
        </Link>
        <Link
          href="/documents"
          className="flex items-center justify-between rounded border border-ink-200 px-2.5 py-1.5 text-[11px] text-ink-600 hover:bg-ink-50"
        >
          <span>자료 창고</span>
          <span className="font-mono font-semibold">{docCount} / 200</span>
        </Link>
      </div>
    </aside>
  )
}
