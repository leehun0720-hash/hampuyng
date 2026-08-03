import Link from 'next/link'
import { createBlankDraft } from '@/app/actions/drafts'
import { Badge, Card, Empty, PageHeader, Progress } from '@/components/ui'
import { countUncitedInDraft } from '@/lib/citations'
import { read } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function DraftsPage() {
  const drafts = await read('drafts')

  return (
    <>
      <PageHeader
        eyebrow="제안서 작성 · 2단계"
        title="초안 작성"
        help="drafts"
        desc={
          <>
            표준 절차 7단계에 따라 작성합니다. 각 단계는 자료 창고 검색 결과만을 근거로 생성되며, 생성된 문장에는 출처
            마커가 붙습니다. 출처 없는 문장이 남아 있으면 검토 단계에서 제출이 차단됩니다.
          </>
        }
      />

      <div className="mb-6">
        <Card
          title="공고 전 사전 기획서 작성"
          desc="제안서 4-3 방식 ② — 2027년 국고 건의 신규 18건 중 1건을 골라 공고 전에 미리 만들어 둡니다. 공고가 뜨는 날 바로 꺼내 씁니다."
        >
          <form action={createBlankDraft} className="flex flex-wrap gap-2">
            <input
              name="title"
              required
              placeholder="사업명 — 예: 함평 빛그린 미래 모빌리티 상생 혁신거점 구축"
              className="min-w-64 flex-1 rounded border border-ink-300 px-2.5 py-1.5 text-[13px] outline-none focus:border-gov-500 focus:ring-2 focus:ring-gov-500/15"
            />
            <button className="rounded bg-ink-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-ink-900">
              사전 기획서 착수
            </button>
          </form>
          <p className="mt-2 text-[11px] text-ink-400">
            공고문이 있는 경우에는 <Link href="/announcements" className="underline">공고문 분석</Link>에서 시작하십시오.
            평가항목이 초안 생성에 반영됩니다.
          </p>
        </Card>
      </div>

      {drafts.length === 0 ? (
        <Empty
          title="작성 중인 초안이 없습니다"
          desc="공고문을 분석하거나 위에서 사전 기획서를 착수하십시오. AI 처리 시간은 자동 계측되며, 담당자 실투입 시간은 성과 측정 화면에서 별도로 실측 입력합니다."
        />
      ) : (
        <div className="space-y-2.5">
          {drafts.map((d) => {
            const done = d.sections.filter((s) => s.status !== 'empty').length
            const uncited = countUncitedInDraft(d.sections)
            const cited = new Set(d.sections.flatMap((s) => s.citedDocIds)).size
            return (
              <Link
                key={d.id}
                href={`/drafts/${d.id}`}
                className="block rounded-lg border border-ink-200 bg-white px-5 py-4 transition hover:border-gov-300 hover:bg-gov-50/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-bold text-ink-900">{d.title}</h3>
                    <p className="mt-0.5 text-[11px] text-ink-500">{d.announcementTitle}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {d.submitted ? (
                      <Badge tone="ok">제출 확정</Badge>
                    ) : d.reviewPassed ? (
                      <Badge tone="gov">검토 통과 · 제출 대기</Badge>
                    ) : (
                      <Badge tone="warn">검토 미통과</Badge>
                    )}
                    {uncited > 0 && <Badge tone="bad">출처 없는 문장 {uncited}건</Badge>}
                    <Badge tone="neutral">인용 {cited}건</Badge>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1">
                    <Progress value={done / 7} tone={done === 7 ? 'ok' : 'gov'} />
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-ink-500">{done} / 7단계</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
