'use client'

import { useActionState } from 'react'
import { confirmSubmission, submitReview, type ReviewActionResult } from '@/app/actions/review'
import { Badge, Notice } from '@/components/ui'
import type { ChecklistItem } from '@/lib/types'

export function ReviewForm({
  draftId,
  checklist,
  defaultReviewer,
  autoPassed,
  reviewPassed,
  submitted,
}: {
  draftId: string
  checklist: ChecklistItem[]
  defaultReviewer: string
  autoPassed: boolean
  reviewPassed: boolean
  submitted: boolean
}) {
  const [reviewState, reviewAction, reviewPending] = useActionState<ReviewActionResult | null, FormData>(
    submitReview,
    null,
  )
  const [submitState, submitAction, submitPending] = useActionState<ReviewActionResult | null, FormData>(
    confirmSubmission,
    null,
  )

  const auto = checklist.filter((c) => c.auto)
  const manual = checklist.filter((c) => !c.auto)
  const canSubmit = autoPassed && reviewPassed && !submitted

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-ink-200 bg-white">
        <header className="border-b border-ink-200 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-bold text-ink-900">자동 검사</h2>
            <Badge tone={autoPassed ? 'ok' : 'bad'}>
              {auto.filter((c) => c.checked).length} / {auto.length} 통과
            </Badge>
          </div>
          <p className="mt-1 text-xs text-ink-500">
            시스템이 직접 검사합니다. 사람이 체크해서 통과시킬 수 없습니다.
          </p>
        </header>
        <ul className="divide-y divide-ink-100">
          {auto.map((item) => (
            <li key={item.id} className="flex gap-3 px-5 py-3">
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white ${
                  item.checked ? 'bg-ok-500' : 'bg-bad-500'
                }`}
              >
                {item.checked ? '✓' : '!'}
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-ink-800">{item.label}</p>
                <p className="mt-0.5 text-[11px] text-ink-400">{item.detail}</p>
                {item.autoResult && (
                  <p className={`mt-1 text-[11.5px] ${item.checked ? 'text-ok-600' : 'text-bad-600'}`}>
                    → {item.autoResult.message}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <form action={reviewAction}>
        <input type="hidden" name="draftId" value={draftId} />
        <section className="rounded-lg border border-ink-200 bg-white">
          <header className="border-b border-ink-200 px-5 py-3.5">
            <h2 className="text-[15px] font-bold text-ink-900">담당자 확인 항목</h2>
            <p className="mt-1 text-xs text-ink-500">
              직접 확인한 항목만 체크하십시오. 체크한 사람의 이름이 검토 이력에 남습니다.
            </p>
          </header>
          <ul className="divide-y divide-ink-100">
            {manual.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer gap-3 px-5 py-3 hover:bg-ink-50">
                  <input
                    type="checkbox"
                    name={`chk_${item.id}`}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-gov-600"
                  />
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-ink-800">{item.label}</p>
                    <p className="mt-0.5 text-[11px] text-ink-400">{item.detail}</p>
                  </div>
                </label>
              </li>
            ))}
          </ul>

          <div className="space-y-2.5 border-t border-ink-200 px-5 py-4">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-ink-600">검토자 *</label>
                <input
                  name="reviewer"
                  required
                  defaultValue={defaultReviewer}
                  className="w-full rounded border border-ink-300 px-2.5 py-1.5 text-[13px] outline-none focus:border-gov-500 focus:ring-2 focus:ring-gov-500/15"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-ink-600">검토 의견</label>
                <input
                  name="comment"
                  className="w-full rounded border border-ink-300 px-2.5 py-1.5 text-[13px] outline-none focus:border-gov-500 focus:ring-2 focus:ring-gov-500/15"
                />
              </div>
            </div>

            {reviewState && <Notice tone={reviewState.ok ? 'ok' : 'bad'}>{reviewState.message}</Notice>}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={reviewPending}
                className="rounded bg-ink-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-ink-900 disabled:bg-ink-300"
              >
                {reviewPending ? '기록 중…' : '검토 결과 기록'}
              </button>
            </div>
          </div>
        </section>
      </form>

      <form action={submitAction}>
        <input type="hidden" name="draftId" value={draftId} />
        <section
          className={`rounded-lg border px-5 py-4 ${
            submitted
              ? 'border-ok-500/30 bg-ok-50'
              : canSubmit
                ? 'border-gov-300 bg-gov-50'
                : 'border-bad-500/30 bg-bad-50'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-ink-900">제출 확정</h2>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-600">
                {submitted
                  ? '제출이 확정되었습니다. 감사 대응 리포트를 내려받아 보관하십시오.'
                  : canSubmit
                    ? '자동 검사와 사람 검토를 모두 통과했습니다. 제출을 확정할 수 있습니다.'
                    : !autoPassed
                      ? '자동 검사 미통과 — 초안을 보완해야 합니다. 이 버튼은 잠겨 있습니다.'
                      : '사람 검토가 완료되지 않았습니다. 위에서 검토 결과를 먼저 기록하십시오.'}
              </p>
            </div>
            <button
              type="submit"
              disabled={!canSubmit || submitPending}
              className={`shrink-0 rounded px-5 py-2 text-[13px] font-semibold transition ${
                canSubmit
                  ? 'bg-gov-600 text-white hover:bg-gov-700'
                  : 'cursor-not-allowed bg-ink-300 text-white'
              }`}
            >
              {submitted ? '제출 확정 완료' : submitPending ? '처리 중…' : canSubmit ? '제출 확정' : '제출 불가 (잠김)'}
            </button>
          </div>
          {submitState && (
            <div className="mt-3">
              <Notice tone={submitState.ok ? 'ok' : 'bad'}>{submitState.message}</Notice>
            </div>
          )}
        </section>
      </form>
    </div>
  )
}
