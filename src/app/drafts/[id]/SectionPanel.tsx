'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { generateDraftSection, saveDraftSection } from '@/app/actions/drafts'
import { Markdown, type MarkerMap } from '@/components/Markdown'
import { Badge, Notice } from '@/components/ui'
import type { DraftSection } from '@/lib/types'

function GenerateButton({ regenerate }: { regenerate: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded px-3 py-1.5 text-[11px] font-semibold transition disabled:bg-ink-300 disabled:text-white ${
        regenerate
          ? 'border border-ink-300 bg-white text-ink-700 hover:bg-ink-50'
          : 'bg-gov-600 text-white hover:bg-gov-700'
      }`}
    >
      {pending ? '생성 중…' : regenerate ? '재생성' : 'AI 초안 생성'}
    </button>
  )
}

function SaveButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-ink-800 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-ink-900 disabled:bg-ink-300"
    >
      {pending ? '저장 중…' : '수정 저장'}
    </button>
  )
}

export function SectionPanel({
  draftId,
  section,
  guide,
  uncitedList,
}: {
  draftId: string
  section: DraftSection
  guide: string
  uncitedList: string[]
}) {
  const [editing, setEditing] = useState(false)
  const empty = section.status === 'empty'

  const markers: MarkerMap = {}
  for (const d of section.usedDocs) markers[d.marker] = { id: d.id, title: d.title }

  return (
    <section id={`step-${section.step}`} className="scroll-mt-6 rounded-lg border border-ink-200 bg-white">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-200 px-5 py-3.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-ink-800 text-[11px] font-bold text-white">
              {section.step}
            </span>
            <h2 className="text-[14px] font-bold text-ink-900">{section.title}</h2>
            {section.status === 'edited' && <Badge tone="gov">담당자 수정</Badge>}
            {section.status === 'generated' && <Badge tone="neutral">AI 생성</Badge>}
            {!empty && section.citedDocIds.length > 0 && (
              <Badge tone="ok">근거 {section.citedDocIds.length}건 인용</Badge>
            )}
            {/* 배지와 아래 경고문이 어긋나지 않도록 둘 다 재계산 결과를 쓴다 */}
            {!empty && uncitedList.length > 0 && (
              <Badge tone="bad">출처 없는 문장 {uncitedList.length}건</Badge>
            )}
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-ink-500">{guide}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {!empty && (
            <button
              onClick={() => setEditing((v) => !v)}
              className="rounded border border-ink-300 px-3 py-1.5 text-[11px] font-semibold text-ink-700 hover:bg-ink-50"
            >
              {editing ? '편집 취소' : '직접 수정'}
            </button>
          )}
          <form action={generateDraftSection}>
            <input type="hidden" name="draftId" value={draftId} />
            <input type="hidden" name="step" value={section.step} />
            <GenerateButton regenerate={!empty} />
          </form>
        </div>
      </header>

      <div className="px-5 py-4">
        {empty ? (
          <p className="py-6 text-center text-[12px] text-ink-400">
            아직 생성하지 않았습니다. AI는 자료 창고 검색 결과만을 근거로 이 항목을 작성합니다.
          </p>
        ) : editing ? (
          <form action={saveDraftSection} className="space-y-2.5">
            <input type="hidden" name="draftId" value={draftId} />
            <input type="hidden" name="step" value={section.step} />
            <textarea
              name="content"
              defaultValue={section.content}
              rows={22}
              className="w-full rounded border border-ink-300 px-3 py-2 font-mono text-[11.5px] leading-relaxed outline-none focus:border-gov-500 focus:ring-2 focus:ring-gov-500/15"
            />
            <p className="text-[11px] text-ink-400">
              [D1] 형식의 출처 마커를 지우면 해당 문장이 &ldquo;출처 없는 문장&rdquo;으로 집계되어 제출이 차단됩니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded border border-ink-300 px-3 py-1.5 text-[11px] font-semibold text-ink-700 hover:bg-ink-50"
              >
                취소
              </button>
              <SaveButton />
            </div>
          </form>
        ) : (
          <>
            <Markdown content={section.content} markers={markers} />

            {section.usedDocs.length > 0 && (
              <div className="mt-4 rounded border border-ink-200 bg-ink-50 px-3.5 py-3">
                <p className="mb-1.5 text-[11px] font-semibold text-ink-600">
                  이 단계에서 AI에 전달된 근거 {section.usedDocs.length}건 — 이 범위 밖의 자료는 전달되지 않았습니다
                </p>
                <ul className="space-y-0.5">
                  {section.usedDocs.map((d) => (
                    <li key={d.marker} className="text-[11px] text-ink-500">
                      <span
                        className={`mr-1.5 font-mono font-semibold ${
                          section.citedDocIds.includes(d.id) ? 'text-gov-600' : 'text-ink-300'
                        }`}
                      >
                        [{d.marker}]
                      </span>
                      {d.title}
                      {!section.citedDocIds.includes(d.id) && (
                        <span className="ml-1.5 text-ink-300">(본문에 인용되지 않음)</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {uncitedList.length > 0 && (
              <div className="mt-3">
                <Notice tone="bad">
                  <strong>출처 없이 사실을 주장한 문장 {uncitedList.length}건</strong> — 감사 대응이 불가능한 문장입니다.
                  근거를 붙이거나 삭제하십시오.
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
                    {uncitedList.slice(0, 5).map((s, i) => (
                      <li key={i} className="leading-relaxed">
                        {s.length > 110 ? `${s.slice(0, 110)}…` : s}
                      </li>
                    ))}
                  </ul>
                  {uncitedList.length > 5 && <p className="mt-1">외 {uncitedList.length - 5}건</p>}
                </Notice>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
