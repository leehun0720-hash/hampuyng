'use client'

import { useActionState, useState } from 'react'
import { createDocument, type ActionResult } from '@/app/actions/documents'
import { Notice } from '@/components/ui'
import { DATA_GRADES, DOC_CATEGORIES } from '@/lib/types'

const INPUT =
  'w-full rounded border border-ink-300 bg-white px-2.5 py-1.5 text-[13px] text-ink-800 outline-none focus:border-gov-500 focus:ring-2 focus:ring-gov-500/15'
const LABEL = 'mb-1 block text-[11px] font-semibold text-ink-600'

export function DocumentForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(createDocument, null)
  const [grade, setGrade] = useState('1')
  const [open, setOpen] = useState(false)

  const blocked = grade === '3' || grade === '4'

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded bg-gov-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gov-700"
      >
        + 자료 등재
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-6">
      <div className="w-full max-w-2xl rounded-lg border border-ink-200 bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-ink-200 px-5 py-3.5">
          <div>
            <h2 className="text-[15px] font-bold text-ink-900">자료 창고에 등재</h2>
            <p className="mt-0.5 text-[11px] text-ink-500">
              등재된 자료만 AI 근거로 사용됩니다. 출처가 없는 자료는 등재할 수 없습니다.
            </p>
          </div>
          <button onClick={() => setOpen(false)} className="text-xs text-ink-500 hover:text-ink-800">
            닫기
          </button>
        </header>

        <form action={action} className="space-y-3.5 px-5 py-4">
          <div>
            <label className={LABEL}>제목 *</label>
            <input name="title" required className={INPUT} placeholder="예: 함평군 주민등록 인구 현황 (2026. 6. 30. 기준)" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>분류</label>
              <select name="category" className={INPUT} defaultValue="인구·통계">
                {DOC_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>기준 시점</label>
              <input name="asOf" className={INPUT} placeholder="예: 2026. 6. 30." />
            </div>
          </div>

          <div>
            <label className={LABEL}>원출처 * — 감사 대응의 근거가 됩니다</label>
            <input
              name="source"
              required
              className={INPUT}
              placeholder="예: 행정안전부 주민등록 인구통계 / 2026. 7. 공표"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>데이터 등급 *</label>
              <select
                name="dataGrade"
                className={INPUT}
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              >
                {([1, 2, 3, 4] as const).map((g) => (
                  <option key={g} value={g}>
                    {DATA_GRADES[g].label}
                    {DATA_GRADES[g].allowed ? '' : ' — 등재 불가'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>검증 상태</label>
              <select name="verificationStatus" className={INPUT} defaultValue="verified">
                <option value="verified">확인됨 — 원출처 확인 완료</option>
                <option value="needs-check">확인 필요 — 착수 시 검증</option>
                <option value="assumption">가정치 — 확정 전 임시값</option>
              </select>
            </div>
          </div>

          {blocked && (
            <Notice tone="bad">
              <strong>{DATA_GRADES[Number(grade) as 3 | 4].label}는 본 사업에서 다루지 않습니다.</strong>
              <br />
              {DATA_GRADES[Number(grade) as 3 | 4].desc} — 제안서 5-2 데이터 등급 규칙에 따라 등재가 차단됩니다.
            </Notice>
          )}

          <div>
            <label className={LABEL}>검증 메모</label>
            <input name="verificationNote" className={INPUT} placeholder="확인이 필요한 부분을 적어 두십시오" />
          </div>

          <div>
            <label className={LABEL}>태그 — 검색어 (쉼표 구분)</label>
            <input name="tags" className={INPUT} placeholder="인구, 주민등록, 인구감소" />
          </div>

          <div>
            <label className={LABEL}>본문 * — 수치는 원문 그대로 옮기십시오</label>
            <textarea name="content" required rows={9} className={`${INPUT} font-mono text-xs leading-relaxed`} />
          </div>

          {state && <Notice tone={state.ok ? 'ok' : 'bad'}>{state.message}</Notice>}

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
              disabled={pending || blocked}
              className="rounded bg-gov-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-gov-700 disabled:cursor-not-allowed disabled:bg-ink-300"
            >
              {pending ? '등재 중…' : blocked ? '등재 불가' : '등재'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
