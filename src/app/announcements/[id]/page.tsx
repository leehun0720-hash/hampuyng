import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CreateDraftButton } from './CreateDraftButton'
import { Badge, Card, LinkButton, Notice, PageHeader } from '@/components/ui'
import { read } from '@/lib/db'
import { EVIDENCE_LABEL } from '@/lib/search'
import { AI_MODE_LABELS } from '@/lib/types'

export const dynamic = 'force-dynamic'

const TONE_MAP = { strong: 'ok', partial: 'warn', none: 'bad' } as const

export default async function AnnouncementDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [announcements, drafts] = await Promise.all([read('announcements'), read('drafts')])
  const a = announcements.find((x) => x.id === id)
  if (!a) notFound()

  const totalPoints = a.evaluationItems.reduce((s, i) => s + (i.points ?? 0), 0)
  const gapPoints = a.evaluationItems
    .filter((i) => i.evidenceLevel === 'none')
    .reduce((s, i) => s + (i.points ?? 0), 0)
  const existingDraft = drafts.find((d) => d.announcementId === a.id)

  return (
    <>
      <PageHeader
        eyebrow={`공고문 분석 결과 · ${a.ministry}`}
        title={a.title}
        help="announcements"
        desc={
          <>
            마감 {a.deadline} · {a.budgetNote}
            <br />
            분석 소요 <strong className="text-ink-700">{a.elapsedSeconds}초</strong>
            {a.aiMode && ` · ${AI_MODE_LABELS[a.aiMode]}`}
          </>
        }
        action={
          existingDraft ? (
            <LinkButton href={`/drafts/${existingDraft.id}`}>초안 이어서 작성 →</LinkButton>
          ) : (
            <CreateDraftButton announcementId={a.id} />
          )
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-ink-200 bg-white px-4 py-3">
          <p className="text-[11px] text-ink-500">추출된 평가항목</p>
          <p className="mt-1 font-mono text-xl font-bold text-ink-900">{a.evaluationItems.length}개</p>
        </div>
        <div className="rounded-lg border border-ink-200 bg-white px-4 py-3">
          <p className="text-[11px] text-ink-500">배점 합계</p>
          <p className="mt-1 font-mono text-xl font-bold text-ink-900">
            {totalPoints > 0 ? `${totalPoints}점` : '미명시'}
          </p>
          {totalPoints > 0 && totalPoints !== 100 && (
            <p className="mt-0.5 text-[10px] text-warn-600">100점과 불일치 — 원문 확인 필요</p>
          )}
        </div>
        <div
          className={`rounded-lg border px-4 py-3 ${
            a.gapQueue.length ? 'border-bad-500/30 bg-bad-50' : 'border-ok-500/30 bg-ok-50'
          }`}
        >
          <p className="text-[11px] text-ink-500">근거 없는 항목</p>
          <p className={`mt-1 font-mono text-xl font-bold ${a.gapQueue.length ? 'text-bad-600' : 'text-ok-600'}`}>
            {a.gapQueue.length}개
          </p>
          {gapPoints > 0 && <p className="mt-0.5 text-[10px] text-bad-600">해당 배점 {gapPoints}점</p>}
        </div>
      </div>

      {a.gapQueue.length > 0 && (
        <div className="mb-5">
          <Notice tone="bad">
            <strong>자료 보강이 필요한 항목 {a.gapQueue.length}개</strong> — 자료 창고에 근거가 없습니다. AI는 없는 근거를
            만들어내지 않으므로, 아래 항목은 <Link href="/documents" className="underline">자료 창고</Link>에 자료를 먼저
            등재해야 초안에 반영됩니다.
            <ul className="mt-1.5 list-disc pl-4">
              {a.gapQueue.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </Notice>
        </div>
      )}

      <Card
        title="평가항목별 함평군 대응 근거"
        desc="각 항목의 근거는 자료 창고 검색으로 자동 매칭된 것입니다. 창고 밖 자료는 인용되지 않습니다."
      >
        <div className="space-y-3">
          {a.evaluationItems.map((item) => {
            const label = EVIDENCE_LABEL[item.evidenceLevel]
            return (
              <div key={item.id} className="rounded border border-ink-200">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-200 bg-ink-50 px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-[13px] font-bold text-ink-900">{item.name}</h3>
                      {item.required && <Badge tone="bad">필수</Badge>}
                    </div>
                    {item.focus && <p className="mt-1 text-[11px] leading-relaxed text-ink-500">{item.focus}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge tone={TONE_MAP[item.evidenceLevel]}>
                      {label.icon} {label.text}
                    </Badge>
                    <span className="font-mono text-sm font-bold text-ink-700">
                      {item.points !== null ? `${item.points}점` : '배점 미명시'}
                    </span>
                  </div>
                </div>

                <div className="px-4 py-3">
                  {item.evidenceLevel === 'none' ? (
                    <p className="text-[12px] text-bad-600">
                      자료 창고에 대응 근거가 없습니다. 이 항목은 초안에서 [확인 필요]로 남습니다.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {item.evidence.map((e) => (
                        <li key={e.docId} className="border-l-2 border-gov-300 pl-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[12px] font-semibold text-ink-800">{e.title}</span>
                            <Badge tone="neutral">관련도 {e.score}</Badge>
                          </div>
                          <p className="mt-0.5 text-[11px] text-ink-400">출처: {e.source}</p>
                          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-600">{e.snippet}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <details className="mt-5 rounded-lg border border-ink-200 bg-white">
        <summary className="cursor-pointer px-5 py-3 text-[13px] font-semibold text-ink-700">공고문 원문 보기</summary>
        <pre className="max-h-96 overflow-auto border-t border-ink-200 px-5 py-4 font-mono text-[11px] leading-relaxed text-ink-600">
          {a.rawText}
        </pre>
      </details>
    </>
  )
}
