'use client'

import { recordTraining } from '@/app/actions/review'
import { Card } from '@/components/ui'

const INPUT =
  'w-full rounded border border-ink-300 px-2.5 py-1.5 text-[13px] outline-none focus:border-gov-500 focus:ring-2 focus:ring-gov-500/15'

export function TrainingForm() {
  return (
    <Card
      title="교육 이수 기록"
      desc="제안서 4-2 4단계 — 담당자 교육 2회(기본 3시간·심화 3시간) 이수 결과를 기록합니다."
    >
      <form action={recordTraining} className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-ink-600">성명 *</label>
            <input name="name" required className={INPUT} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-ink-600">부서</label>
            <input name="department" className={INPUT} placeholder="예: 기획예산실" />
          </div>
        </div>

        <div className="space-y-1.5 rounded border border-ink-200 px-3 py-2.5">
          <label className="flex items-center gap-2 text-[12px] text-ink-700">
            <input type="checkbox" name="basicDone" className="h-4 w-4 accent-gov-600" />
            기본 교육 3시간 이수
          </label>
          <label className="flex items-center gap-2 text-[12px] text-ink-700">
            <input type="checkbox" name="advancedDone" className="h-4 w-4 accent-gov-600" />
            심화 교육 3시간 이수
          </label>
          <label className="flex items-center gap-2 text-[12px] font-semibold text-ink-800">
            <input type="checkbox" name="soloCapable" className="h-4 w-4 accent-gov-600" />
            단독 수행 가능 확인 — 게이트① 통과 조건
          </label>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold text-ink-600">비고</label>
          <input name="note" className={INPUT} placeholder="예: 실습 과제 1건 단독 완료 확인" />
        </div>

        <button className="w-full rounded bg-ink-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-ink-900">
          이수 기록
        </button>
      </form>
    </Card>
  )
}
