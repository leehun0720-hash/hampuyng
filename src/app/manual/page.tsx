import Link from 'next/link'
import { MANUAL } from './manual-data'
import { Badge, Notice, PageHeader } from '@/components/ui'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: '업무 매뉴얼 · 함평군 국비 공모 제안서 작성 지원 시스템',
}

export default function ManualPage() {
  return (
    <>
      <PageHeader
        eyebrow="검수 대상 결과물 ① · 표준 업무 매뉴얼"
        title="업무 매뉴얼"
        desc={
          <>
            화면별 사용 방법과 지켜야 할 규칙을 정리했습니다. 각 화면 오른쪽 위의 <strong>도움말</strong> 단추를
            누르면 해당 항목으로 바로 이동합니다. 처음 사용하신다면{' '}
            <Link href="#overview" className="font-semibold text-gov-600 underline">
              「전체 업무 흐름」
            </Link>
            부터 읽으십시오.
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[210px_1fr]">
        {/* 목차 */}
        <nav className="lg:sticky lg:top-0 lg:h-fit lg:self-start">
          <p className="mb-2 text-[11px] font-bold tracking-wider text-ink-400">목차</p>
          <ul className="space-y-0.5">
            {MANUAL.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block rounded px-2 py-1.5 text-[12px] leading-snug text-ink-600 transition hover:bg-ink-100 hover:text-ink-900"
                >
                  <span className="mr-1.5 font-mono text-[10px] text-ink-400">{s.no}</span>
                  {s.title.split(' — ')[0]}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded border border-ink-200 bg-white px-3 py-2.5">
            <p className="text-[10.5px] leading-relaxed text-ink-500">
              이 매뉴얼은 제안서 4-1의 검수 대상 결과물 ①에 해당합니다. 화면 동작이 바뀌면 이 문서도 함께
              갱신하십시오.
            </p>
          </div>
        </nav>

        {/* 본문 */}
        <div className="min-w-0 space-y-8">
          {MANUAL.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-6">
              <header className="mb-3 border-b-2 border-ink-200 pb-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[11px] font-bold text-white">
                    {s.no}
                  </span>
                  <h2 className="text-[16px] font-bold text-ink-900">{s.title}</h2>
                  {s.route && (
                    <Link
                      href={s.route}
                      className="rounded border border-gov-300 bg-gov-50 px-2 py-0.5 text-[11px] font-semibold text-gov-700 hover:bg-gov-100"
                    >
                      화면 열기 →
                    </Link>
                  )}
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-600">{s.summary}</p>
              </header>

              {s.when.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-1.5 text-[12px] font-bold text-ink-700">언제 사용하는가</h3>
                  <ul className="space-y-1">
                    {s.when.map((w, i) => (
                      <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-ink-600">
                        <span className="text-ink-300">·</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {s.screen && s.screen.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-1.5 text-[12px] font-bold text-ink-700">
                    {s.route ? '화면 구성' : '항목별 설명'}
                  </h3>
                  {/* 좁은 화면에서는 이름과 설명을 세로로 쌓는다. 표로 두면 라벨 열 고정폭 때문에 잘린다. */}
                  <dl className="divide-y divide-ink-100 overflow-hidden rounded border border-ink-200">
                    {s.screen.map((row, i) => (
                      <div key={i} className="sm:flex">
                        <dt className="bg-ink-50 px-3 py-2.5 text-[12.5px] font-semibold text-ink-800 sm:w-52 sm:shrink-0">
                          {row.name}
                        </dt>
                        <dd className="min-w-0 px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-600">
                          {row.desc}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {s.steps && s.steps.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-1.5 text-[12px] font-bold text-ink-700">사용 절차</h3>
                  <ol className="space-y-2.5">
                    {s.steps.map((step, i) => (
                      <li key={i} className="rounded border border-ink-200 bg-white px-3.5 py-2.5">
                        <p className="text-[12.5px] font-semibold text-ink-900">{step.title}</p>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-600">{step.detail}</p>
                        {step.note && (
                          <p className="mt-1.5 border-l-2 border-warn-500/40 pl-2.5 text-[12px] leading-relaxed text-warn-600">
                            {step.note}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {s.cautions && s.cautions.length > 0 && (
                <div className="mb-3">
                  <Notice tone="warn">
                    <strong>반드시 지켜 주십시오</strong>
                    <ul className="mt-1.5 space-y-1">
                      {s.cautions.map((c, i) => (
                        <li key={i} className="flex gap-2">
                          <span>·</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </Notice>
                </div>
              )}

              {s.basis && (
                <p className="text-[11px] text-ink-400">
                  <Badge tone="neutral">근거</Badge> <span className="ml-1">{s.basis}</span>
                </p>
              )}
            </section>
          ))}

          <div className="border-t border-ink-200 pt-5">
            <Notice>
              매뉴얼에서 답을 찾지 못하셨다면{' '}
              <Link href="#troubleshooting" className="font-semibold underline">
                「부록 B 문제 해결」
              </Link>
              을 확인하십시오. 그래도 해결되지 않으면 시스템 담당자에게 문의하시되,{' '}
              <Link href="/review" className="font-semibold underline">
                전체 활동 이력
              </Link>
              의 기록을 함께 전달하시면 원인 파악이 빠릅니다.
            </Notice>
          </div>
        </div>
      </div>
    </>
  )
}
