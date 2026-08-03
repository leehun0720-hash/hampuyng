import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExportPanel } from './ExportPanel'
import { SectionPanel } from './SectionPanel'
import { Badge, Card, LinkButton, Notice, PageHeader, Progress } from '@/components/ui'
import { countUncitedInDraft, findUncitedSentences } from '@/lib/citations'
import { read } from '@/lib/db'
import { formatMinutes } from '@/lib/metrics'
import { AI_MODE_LABELS, DRAFT_STEPS } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function DraftDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [drafts, documents, settings] = await Promise.all([read('drafts'), read('documents'), read('settings')])
  const draft = drafts.find((d) => d.id === id)
  if (!draft) notFound()

  const done = draft.sections.filter((s) => s.status !== 'empty').length
  const totalUncited = countUncitedInDraft(draft.sections)
  const citedIds = new Set(draft.sections.flatMap((s) => s.citedDocIds))
  const citedDocs = documents.filter((d) => citedIds.has(d.id))

  return (
    <>
      <PageHeader
        eyebrow={`초안 · ${draft.announcementTitle}`}
        title={draft.title}
        help="drafts"
        desc={
          <>
            표준 절차 7단계 중 <strong className="text-ink-700">{done}단계</strong> 작성 완료 · 누적 AI 처리 시간{' '}
            <strong className="text-ink-700">{formatMinutes(draft.elapsedSeconds / 60)}</strong> (담당자 검토 시간
            제외) · {AI_MODE_LABELS[settings.aiMode]}
          </>
        }
        action={
          <div className="flex gap-2">
            {draft.announcementId && (
              <LinkButton href={`/announcements/${draft.announcementId}`} variant="ghost">
                공고 분석 보기
              </LinkButton>
            )}
            <LinkButton href={`/review/${draft.id}`}>검토·제출 →</LinkButton>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-ink-200 bg-white px-4 py-3">
          <p className="text-[11px] text-ink-500">작성 진행</p>
          <p className="mt-1 font-mono text-lg font-bold text-ink-900">{done} / 7</p>
          <div className="mt-2">
            <Progress value={done / 7} tone={done === 7 ? 'ok' : 'gov'} />
          </div>
        </div>
        <div className="rounded-lg border border-ink-200 bg-white px-4 py-3">
          <p className="text-[11px] text-ink-500">인용된 근거</p>
          <p className="mt-1 font-mono text-lg font-bold text-ink-900">{citedIds.size}건</p>
          <p className="mt-1 text-[10px] text-ink-400">자료 창고 {documents.length}건 중</p>
        </div>
        <div
          className={`rounded-lg border px-4 py-3 ${
            totalUncited > 0 ? 'border-bad-500/30 bg-bad-50' : 'border-ok-500/30 bg-ok-50'
          }`}
        >
          <p className="text-[11px] text-ink-500">출처 없는 문장</p>
          <p className={`mt-1 font-mono text-lg font-bold ${totalUncited > 0 ? 'text-bad-600' : 'text-ok-600'}`}>
            {totalUncited}건
          </p>
          <p className="mt-1 text-[10px] text-ink-400">{totalUncited > 0 ? '제출 차단 사유' : '제출 가능'}</p>
        </div>
        <div className="rounded-lg border border-ink-200 bg-white px-4 py-3">
          <p className="text-[11px] text-ink-500">제출 상태</p>
          <p className="mt-1 text-[13px] font-bold text-ink-900">
            {draft.submitted ? '제출 확정' : draft.reviewPassed ? '검토 통과' : '검토 미통과'}
          </p>
          <p className="mt-1 text-[10px] text-ink-400">
            {draft.submitted ? draft.submittedAt?.slice(0, 10) : '검토 확인목록 통과 필요'}
          </p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {draft.sections.map((s) => (
          <a
            key={s.step}
            href={`#step-${s.step}`}
            className={`rounded border px-2.5 py-1 text-[11px] font-medium ${
              s.status === 'empty'
                ? 'border-ink-200 bg-white text-ink-400'
                : s.uncitedSentences > 0
                  ? 'border-bad-500/30 bg-bad-50 text-bad-600'
                  : 'border-ok-500/30 bg-ok-50 text-ok-600'
            }`}
          >
            {s.step}. {s.title}
          </a>
        ))}
      </div>

      {documents.length === 0 && (
        <div className="mb-5">
          <Notice tone="bad">
            자료 창고가 비어 있습니다. 근거가 없으면 초안을 생성하지 않습니다.{' '}
            <Link href="/documents" className="underline">
              자료 창고
            </Link>
            에 먼저 자료를 등재하십시오.
          </Notice>
        </div>
      )}

      <div className="space-y-4">
        {draft.sections.map((s) => (
          <SectionPanel
            key={s.step}
            draftId={draft.id}
            section={s}
            guide={DRAFT_STEPS.find((x) => x.step === s.step)?.guide ?? ''}
            uncitedList={s.content ? findUncitedSentences(s.content) : []}
          />
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="인용된 근거 목록" desc="감사 시 이 목록으로 모든 수치의 출처를 설명할 수 있습니다.">
          {citedDocs.length === 0 ? (
            <p className="text-[12px] text-ink-400">아직 인용된 근거가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {citedDocs.map((d) => (
                <li key={d.id} className="border-l-2 border-gov-300 pl-3">
                  <p className="text-[12px] font-semibold text-ink-800">{d.title}</p>
                  <p className="mt-0.5 text-[11px] text-ink-400">출처: {d.source}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="작업 이력" desc="생성·재생성·수정이 모두 기록됩니다 (제안서 5-2 ㉰).">
          {draft.editLog.length === 0 ? (
            <p className="text-[12px] text-ink-400">아직 이력이 없습니다.</p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {draft.editLog.map((l, i) => (
                <li key={i} className="flex gap-2.5 text-[11px]">
                  <span className="shrink-0 font-mono text-ink-400">{l.at.slice(5, 16).replace('T', ' ')}</span>
                  <div className="min-w-0">
                    <span className="font-semibold text-ink-700">
                      {l.step}단계{' '}
                      {l.action === 'generate'
                        ? '생성'
                        : l.action === 'regenerate'
                          ? '재생성'
                          : l.action === 'edit'
                            ? '수정'
                            : '확정'}
                    </span>
                    <span className="ml-1.5 text-ink-400">{l.actor}</span>
                    <p className="text-ink-500">{l.note}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4">
        <ExportPanel draft={draft} citedDocs={citedDocs.map((d) => ({ title: d.title, source: d.source }))} />
      </div>

      {done < 7 && (
        <div className="mt-4">
          <Notice tone="warn">
            아직 {7 - done}개 단계가 비어 있습니다. 표준 절차 7단계를 모두 채워야 검토 확인목록을 통과할 수 있습니다.
          </Notice>
        </div>
      )}
      {done === 7 && !draft.reviewPassed && (
        <div className="mt-4">
          <Notice>
            7단계 작성이 완료되었습니다.{' '}
            <Link href={`/review/${draft.id}`} className="font-semibold underline">
              검토·감사 대응
            </Link>
            에서 확인목록을 통과해야 제출을 확정할 수 있습니다.
          </Notice>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {draft.sections
          .filter((s) => s.status !== 'empty')
          .slice(0, 1)
          .map(() => null)}
        <Badge tone="neutral">초안 ID {draft.id}</Badge>
      </div>
    </>
  )
}
