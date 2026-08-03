'use client'

import { useActionState, useState } from 'react'
import { executePrompt, type RunResult } from '@/app/actions/prompts'
import { Markdown } from '@/components/Markdown'
import { Badge, Notice } from '@/components/ui'
import type { PromptTemplate } from '@/lib/types'

const CATEGORY_TONE = {
  공고분석: 'gov',
  자료수집: 'neutral',
  초안작성: 'ok',
  검토보완: 'warn',
  사후관리: 'bad',
} as const

export function PromptCard({ prompt }: { prompt: PromptTemplate }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [state, action, pending] = useActionState<RunResult | null, FormData>(executePrompt, null)

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt.body)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <article className="rounded-lg border border-ink-200 bg-white">
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[11px] font-bold text-ink-400">
              {String(prompt.no).padStart(2, '0')}
            </span>
            <Badge tone={CATEGORY_TONE[prompt.category]}>{prompt.category}</Badge>
            {prompt.linkedStep && <Badge tone="neutral">표준절차 {prompt.linkedStep}단계</Badge>}
            {prompt.custom && <Badge tone="gov">담당자 추가</Badge>}
            {prompt.useCount > 0 && <Badge tone="neutral">사용 {prompt.useCount}회</Badge>}
          </div>
          <h3 className="text-[14px] font-bold text-ink-900">{prompt.title}</h3>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-500">{prompt.purpose}</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={copy}
            className="rounded border border-ink-300 px-2.5 py-1 text-[11px] font-semibold text-ink-700 hover:bg-ink-50"
          >
            {copied ? '복사됨' : '복사'}
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded bg-gov-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-gov-700"
          >
            {open ? '닫기' : '열기'}
          </button>
        </div>
      </header>

      {open && (
        <div className="border-t border-ink-200 px-5 py-4">
          <p className="mb-1.5 text-[11px] font-semibold text-ink-600">지시문 원문</p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded border border-ink-200 bg-ink-50 px-3.5 py-3 font-mono text-[11px] leading-relaxed text-ink-600">
            {prompt.body}
          </pre>

          <form action={action} className="mt-4 space-y-2.5">
            <input type="hidden" name="promptId" value={prompt.id} />
            {prompt.variables.length > 0 && (
              <>
                <p className="text-[11px] font-semibold text-ink-600">변수 입력 ({prompt.variables.length}개)</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {prompt.variables.map((v) => (
                    <div key={v}>
                      <label className="mb-0.5 block text-[10px] text-ink-500">{`{{${v}}}`}</label>
                      <textarea
                        name={`var_${v}`}
                        rows={v.length > 4 ? 3 : 1}
                        className="w-full rounded border border-ink-300 px-2 py-1.5 text-[12px] outline-none focus:border-gov-500 focus:ring-2 focus:ring-gov-500/15"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-[10.5px] leading-relaxed text-ink-400">
                실행 시 자료 창고에서 관련 근거를 검색해 함께 전달합니다. 그 범위 밖의 자료는 전송되지 않습니다.
              </p>
              <button
                type="submit"
                disabled={pending}
                className="shrink-0 rounded bg-ink-800 px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-ink-900 disabled:bg-ink-300"
              >
                {pending ? '실행 중…' : '이 지시문으로 실행'}
              </button>
            </div>
          </form>

          {state && (
            <div className="mt-4 border-t border-ink-200 pt-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold text-ink-600">실행 결과</p>
                <Badge tone="neutral">{state.note}</Badge>
              </div>
              {state.usedDocs.length > 0 && (
                <div className="mb-3">
                  <Notice>
                    <strong>전달된 근거 {state.usedDocs.length}건</strong>
                    <ul className="mt-1 space-y-0.5">
                      {state.usedDocs.map((d) => (
                        <li key={d.marker}>
                          <span className="font-mono font-semibold">[{d.marker}]</span> {d.title}
                        </li>
                      ))}
                    </ul>
                  </Notice>
                </div>
              )}
              <div className="rounded border border-ink-200 px-4 py-3">
                <Markdown
                  content={state.text}
                  markers={Object.fromEntries(state.usedDocs.map((d) => [d.marker, { id: d.id, title: d.title }]))}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  )
}
