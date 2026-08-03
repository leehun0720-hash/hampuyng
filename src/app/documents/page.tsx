import Link from 'next/link'
import { DocumentForm } from './DocumentForm'
import { Badge, Card, Notice, PageHeader, Progress, VERIFICATION_BADGE } from '@/components/ui'
import { read } from '@/lib/db'
import { GATE1_DOC_TARGET } from '@/lib/metrics'
import { DocumentIndex, makeSnippet } from '@/lib/search'
import { DATA_GRADES, DOC_CATEGORIES } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>
}) {
  const { q = '', cat = '' } = await searchParams
  const all = await read('documents')

  const filtered = cat ? all.filter((d) => d.category === cat) : all
  const results = q.trim()
    ? new DocumentIndex(filtered).search(q, 50)
    : filtered.map((doc) => ({ doc, score: 0 }))

  const byCategory = DOC_CATEGORIES.map((c) => ({ c, n: all.filter((d) => d.category === c).length })).filter(
    (x) => x.n > 0,
  )

  return (
    <>
      <PageHeader
        eyebrow="기반 · 검수 대상 결과물 ②"
        title="함평군 자료 창고"
        desc={
          <>
            AI는 <strong className="text-ink-700">이 창고 안에서만</strong> 근거를 찾습니다 (제안서 5-2 ㉮). 창고에 없는
            자료는 어떤 경로로도 초안에 인용되지 않으며, 등재된 모든 문서에는 원출처가 기록됩니다. 데이터 3등급(대외비)·
            4등급(개인정보)은 등재 자체가 차단됩니다.
          </>
        }
        action={<DocumentForm />}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <p className="text-[11px] font-semibold text-ink-500">게이트① 조건 ㉯ — 자료 창고 적재</p>
          <p className="mt-2 font-mono text-2xl font-bold text-ink-900">
            {all.length}
            <span className="text-base font-normal text-ink-400"> / {GATE1_DOC_TARGET}건</span>
          </p>
          <div className="mt-2.5">
            <Progress
              value={all.length / GATE1_DOC_TARGET}
              tone={all.length >= GATE1_DOC_TARGET ? 'ok' : 'warn'}
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-500">
            {all.length >= GATE1_DOC_TARGET
              ? '목표를 충족했습니다.'
              : `${GATE1_DOC_TARGET - all.length}건이 더 필요합니다. 2단계 체계 설계(3~5주차)에서 적재합니다.`}
          </p>
        </Card>

        <Card className="md:col-span-2">
          <p className="mb-2.5 text-[11px] font-semibold text-ink-500">분류별 적재 현황</p>
          <div className="flex flex-wrap gap-1.5">
            <Link
              href="/documents"
              className={`rounded border px-2 py-1 text-[11px] font-medium ${
                !cat ? 'border-gov-600 bg-gov-600 text-white' : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
              }`}
            >
              전체 {all.length}
            </Link>
            {byCategory.map(({ c, n }) => (
              <Link
                key={c}
                href={`/documents?cat=${encodeURIComponent(c)}`}
                className={`rounded border px-2 py-1 text-[11px] font-medium ${
                  cat === c
                    ? 'border-gov-600 bg-gov-600 text-white'
                    : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
                }`}
              >
                {c} {n}
              </Link>
            ))}
          </div>
          <form className="mt-4 flex gap-2">
            {cat && <input type="hidden" name="cat" value={cat} />}
            <input
              name="q"
              defaultValue={q}
              placeholder="근거 검색 — 예: 고령화율, 재정자립도, 국고 건의, 선정 실적"
              className="flex-1 rounded border border-ink-300 px-2.5 py-1.5 text-[13px] outline-none focus:border-gov-500 focus:ring-2 focus:ring-gov-500/15"
            />
            <button className="rounded bg-ink-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-ink-900">
              검색
            </button>
          </form>
        </Card>
      </div>

      {q && (
        <div className="mb-4">
          <Notice>
            <strong>&ldquo;{q}&rdquo;</strong> 검색 결과 {results.length}건 — 초안 생성 시 AI에 전달되는 근거도 이와 동일한
            검색 방식으로 선별됩니다.{' '}
            <Link href={cat ? `/documents?cat=${encodeURIComponent(cat)}` : '/documents'} className="underline">
              검색 해제
            </Link>
          </Notice>
        </div>
      )}

      <div className="space-y-2.5">
        {results.length === 0 && (
          <div className="rounded-lg border border-dashed border-ink-300 bg-white px-6 py-12 text-center">
            <p className="text-sm font-semibold text-ink-700">검색 결과가 없습니다</p>
            <p className="mt-2 text-xs text-ink-500">
              자료 창고에 없는 내용은 AI가 만들어내지 않습니다. 필요한 자료를 먼저 등재하십시오.
            </p>
          </div>
        )}

        {results.map(({ doc, score }) => {
          const v = VERIFICATION_BADGE[doc.verificationStatus]
          return (
            <article key={doc.id} className="rounded-lg border border-ink-200 bg-white px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone="gov">{doc.category}</Badge>
                    <Badge tone={doc.dataGrade === 1 ? 'neutral' : 'warn'} title={DATA_GRADES[doc.dataGrade].desc}>
                      {DATA_GRADES[doc.dataGrade].label}
                    </Badge>
                    <Badge tone={v.tone} title={doc.verificationNote}>
                      {v.label}
                    </Badge>
                    {score > 0 && <Badge tone="neutral">관련도 {score.toFixed(1)}</Badge>}
                  </div>
                  <h3 className="text-[14px] font-bold leading-snug text-ink-900">{doc.title}</h3>
                  <p className="mt-1 text-[11px] text-ink-500">
                    출처: {doc.source}
                    {doc.asOf && ` · 기준 ${doc.asOf}`}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-ink-400">{doc.id}</span>
              </div>

              <p className="mt-2.5 border-l-2 border-ink-200 pl-3 text-[12px] leading-relaxed text-ink-600">
                {q ? makeSnippet(doc.content, q, 260) : makeSnippet(doc.content, doc.title, 260)}
              </p>

              {doc.verificationNote && (
                <p className="mt-2 text-[11px] text-warn-600">주의: {doc.verificationNote}</p>
              )}

              {doc.tags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {doc.tags.map((t) => (
                    <span key={t} className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] text-ink-500">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </>
  )
}
