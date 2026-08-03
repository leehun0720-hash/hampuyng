import { notFound } from 'next/navigation'
import { AuditReport } from './AuditReport'
import { ReviewForm } from './ReviewForm'
import { Badge, Card, LinkButton, PageHeader } from '@/components/ui'
import { buildChecklist } from '@/lib/checklist'
import { read } from '@/lib/db'
import { AI_MODE_LABELS } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ReviewDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [drafts, announcements, reviews, documents, settings, audit] = await Promise.all([
    read('drafts'),
    read('announcements'),
    read('reviews'),
    read('documents'),
    read('settings'),
    read('audit'),
  ])

  const draft = drafts.find((d) => d.id === id)
  if (!draft) notFound()

  const announcement = announcements.find((a) => a.id === draft.announcementId)
  const checklist = buildChecklist(draft, announcement)
  const autoPassed = checklist.filter((c) => c.auto).every((c) => c.checked)
  const history = reviews.filter((r) => r.draftId === id)

  const citedIds = new Set(draft.sections.flatMap((s) => s.citedDocIds))
  const citedDocs = documents.filter((d) => citedIds.has(d.id))
  const relatedAudit = audit.filter((e) => e.target.includes(draft.title) || e.target.includes(draft.id))

  return (
    <>
      <PageHeader
        eyebrow="검토·감사 대응"
        title={draft.title}
        desc={
          <>
            {draft.announcementTitle} · {AI_MODE_LABELS[settings.aiMode]}
          </>
        }
        action={<LinkButton href={`/drafts/${draft.id}`} variant="ghost">← 초안으로</LinkButton>}
      />

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div>
          <ReviewForm
            draftId={draft.id}
            checklist={checklist}
            defaultReviewer={settings.currentUser}
            autoPassed={autoPassed}
            reviewPassed={draft.reviewPassed}
            submitted={draft.submitted}
          />
        </div>

        <div className="space-y-4">
          <AuditReport
            draft={draft}
            announcement={announcement}
            citedDocs={citedDocs}
            reviews={history}
            auditEntries={relatedAudit}
          />

          <Card title="검토 이력" desc="결정 주체가 사람임이 기록으로 남습니다 (제안서 5-2 ㉰).">
            {history.length === 0 ? (
              <p className="text-[12px] text-ink-400">아직 검토 기록이 없습니다.</p>
            ) : (
              <ul className="space-y-3">
                {history.map((r) => (
                  <li key={r.id} className="border-l-2 border-ink-200 pl-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[12px] font-semibold text-ink-800">{r.reviewer}</span>
                      <Badge tone={r.passed ? 'ok' : 'bad'}>{r.passed ? '통과' : '미통과'}</Badge>
                      <span className="font-mono text-[10.5px] text-ink-400">
                        {r.reviewedAt.slice(0, 16).replace('T', ' ')}
                      </span>
                    </div>
                    {r.comment && <p className="mt-1 text-[11.5px] text-ink-600">{r.comment}</p>}
                    {!r.passed && (
                      <p className="mt-1 text-[11px] text-bad-600">
                        미충족: {r.checklist.filter((c) => !c.checked).map((c) => c.label).join(' / ')}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="인용 근거 대조표" desc="감사에서 수치 근거를 묻는 질문에 이 표로 답합니다.">
            {citedDocs.length === 0 ? (
              <p className="text-[12px] text-ink-400">인용된 근거가 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {citedDocs.map((d) => (
                  <li key={d.id} className="text-[11.5px]">
                    <p className="font-semibold text-ink-800">{d.title}</p>
                    <p className="text-ink-400">
                      {d.source}
                      {d.asOf && ` · 기준 ${d.asOf}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
