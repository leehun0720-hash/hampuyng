'use client'

import { useState } from 'react'
import { createCustomPrompt } from '@/app/actions/prompts'
import { Notice } from '@/components/ui'
import { PROMPT_CATEGORIES } from '@/lib/types'

const INPUT =
  'w-full rounded border border-ink-300 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-gov-500 focus:ring-2 focus:ring-gov-500/15'
const LABEL = 'mb-1 block text-[11px] font-semibold text-ink-600'

export function CustomPromptForm() {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded bg-gov-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gov-700"
      >
        + 지시문 추가
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-6">
      <div className="w-full max-w-2xl rounded-lg border border-ink-200 bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-ink-200 px-5 py-3.5">
          <div>
            <h2 className="text-[15px] font-bold text-ink-900">담당자 지시문 추가</h2>
            <p className="mt-0.5 text-[11px] text-ink-500">
              업무를 하며 발견한 좋은 지시문을 축적하십시오. 인사이동 후에도 남습니다.
            </p>
          </div>
          <button onClick={() => setOpen(false)} className="text-xs text-ink-500 hover:text-ink-800">
            닫기
          </button>
        </header>

        <form action={createCustomPrompt} className="space-y-3.5 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL}>제목 *</label>
              <input name="title" required className={INPUT} placeholder="예: 지방비 확보 계획서 초안" />
            </div>
            <div>
              <label className={LABEL}>분류</label>
              <select name="category" className={INPUT} defaultValue="초안작성">
                {PROMPT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={LABEL}>용도</label>
            <input name="purpose" className={INPUT} placeholder="언제 쓰는 지시문인지 한 줄로" />
          </div>

          <div>
            <label className={LABEL}>지시문 본문 * — {'{{변수명}}'} 형태로 쓰면 실행 시 입력란이 생깁니다</label>
            <textarea
              name="body"
              required
              rows={10}
              className={`${INPUT} font-mono text-xs leading-relaxed`}
              placeholder={'아래 {{사업명}}에 대해 …\n\n규칙:\n- 근거 자료 안의 내용만 사용하라\n- 문장 끝에 [D1] 형식으로 출처를 표기하라'}
            />
          </div>

          <Notice>
            근거 자료 밖의 사실을 만들지 않도록 지시문에 명시하십시오. 실행 시 자료 창고 한정 규칙이 자동으로 함께
            적용되지만, 지시문 자체에도 적어 두는 편이 안전합니다.
          </Notice>

          <div className="flex justify-end gap-2 border-t border-ink-200 pt-3.5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded border border-ink-300 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
            >
              취소
            </button>
            <button
              type="submit"
              onClick={() => setTimeout(() => setOpen(false), 100)}
              className="rounded bg-gov-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-gov-700"
            >
              추가
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
