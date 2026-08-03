import Link from 'next/link'
import { Badge, Empty, PageHeader } from '@/components/ui'
import { countUncitedInDraft } from '@/lib/citations'
import { read } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function ReviewIndex() {
  const [drafts, reviews, audit] = await Promise.all([read('drafts'), read('reviews'), read('audit')])

  return (
    <>
      <PageHeader
        eyebrow="제안서 작성 · 3단계"
        title="검토·감사 대응"
        help="review"
        desc={
          <>
            검토 확인목록을 통과하지 않으면 제출을 확정할 수 없습니다 (제안서 5-2 ㉰). 자동 판정 항목은 시스템이 직접
            검사하므로 체크만으로 통과시킬 수 없으며, 모든 검토 이력은 자동으로 기록됩니다.
          </>
        }
      />

      {drafts.length === 0 ? (
        <Empty title="검토할 초안이 없습니다" desc="초안 작성을 먼저 진행하십시오." />
      ) : (
        <div className="mb-8 space-y-2.5">
          {drafts.map((d) => {
            const last = reviews.find((r) => r.draftId === d.id)
            const uncited = countUncitedInDraft(d.sections)
            const filled = d.sections.filter((s) => s.status !== 'empty').length
            return (
              <Link
                key={d.id}
                href={`/review/${d.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-200 bg-white px-5 py-4 transition hover:border-gov-300 hover:bg-gov-50/40"
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-ink-900">{d.title}</p>
                  <p className="mt-0.5 text-[11px] text-ink-500">
                    {filled}/7단계 작성 ·{' '}
                    {last ? `최근 검토 ${last.reviewedAt.slice(0, 10)} (${last.reviewer})` : '검토 이력 없음'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  {d.submitted ? (
                    <Badge tone="ok">제출 확정</Badge>
                  ) : d.reviewPassed ? (
                    <Badge tone="gov">검토 통과 · 제출 대기</Badge>
                  ) : (
                    <Badge tone="warn">제출 차단</Badge>
                  )}
                  {uncited > 0 && <Badge tone="bad">출처 없는 문장 {uncited}건</Badge>}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <section className="rounded-lg border border-ink-200 bg-white">
        <header className="border-b border-ink-200 px-5 py-3.5">
          <h2 className="text-[15px] font-bold text-ink-900">전체 활동 이력</h2>
          <p className="mt-1 text-xs text-ink-500">
            자료 등재·차단, AI 생성, 검토, 제출이 모두 기록됩니다. 감사 시 &ldquo;누가 언제 무엇을 했는가&rdquo;에 답하는
            근거입니다.
          </p>
        </header>
        <div className="max-h-[32rem] overflow-y-auto px-5 py-4">
          <ul className="space-y-2.5">
            {audit.map((e) => (
              <li key={e.id} className="flex gap-3 border-b border-ink-100 pb-2.5 last:border-0">
                <span className="w-28 shrink-0 font-mono text-[10.5px] text-ink-400">
                  {e.at.slice(0, 16).replace('T', ' ')}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[12px] font-semibold text-ink-800">{e.action}</span>
                    <span className="text-[11px] text-ink-400">{e.actor}</span>
                    {e.aiMode && <Badge tone="gov">{e.aiMode}</Badge>}
                  </div>
                  <p className="text-[11.5px] text-ink-600">{e.target}</p>
                  <p className="text-[11px] text-ink-400">{e.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}
