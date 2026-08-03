import Link from 'next/link'
import { AnnouncementForm } from './AnnouncementForm'
import { Badge, Card, PageHeader } from '@/components/ui'
import { read } from '@/lib/db'
import { AI_MODE_LABELS } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function AnnouncementsPage() {
  const [announcements, documents] = await Promise.all([read('announcements'), read('documents')])

  return (
    <>
      <PageHeader
        eyebrow="제안서 작성 · 1단계"
        title="공고문 분석"
        desc={
          <>
            공고문을 넣으면 평가항목이 표로 정리되고, 항목마다 함평군의 대응 근거가 자료 창고에서 자동으로 붙습니다
            (제안서 2-2). AI 처리 시간은 자동 계측되며, 담당자 실투입 시간은 별도로 실측해 입력합니다. 현재 자료
            창고에는 <strong className="text-ink-700">{documents.length}건</strong>의 근거가 적재되어 있습니다.
          </>
        }
      />

      {announcements.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2.5 text-[13px] font-bold text-ink-700">분석 이력</h2>
          <div className="space-y-2">
            {announcements.map((a) => {
              const gaps = a.gapQueue.length
              const total = a.evaluationItems.reduce((s, i) => s + (i.points ?? 0), 0)
              return (
                <Link
                  key={a.id}
                  href={`/announcements/${a.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-200 bg-white px-4 py-3 transition hover:border-gov-300 hover:bg-gov-50/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink-900">{a.title}</p>
                    <p className="mt-0.5 text-[11px] text-ink-500">
                      {a.ministry} · 마감 {a.deadline} · 평가항목 {a.evaluationItems.length}개
                      {total > 0 && ` (배점 합계 ${total}점)`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {gaps > 0 ? (
                      <Badge tone="bad">근거 없음 {gaps}개</Badge>
                    ) : (
                      <Badge tone="ok">근거 확보</Badge>
                    )}
                    <Badge tone="neutral">분석 {a.elapsedSeconds}초</Badge>
                    {a.aiMode && <Badge tone="gov">{AI_MODE_LABELS[a.aiMode].split(' ')[0]}</Badge>}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <Card
        title="새 공고문 분석"
        desc="공고문 전문을 붙여넣으십시오. 배점표가 포함된 부분이 반드시 있어야 평가항목을 추출할 수 있습니다."
      >
        <AnnouncementForm />
      </Card>
    </>
  )
}
