'use client'

import { useState } from 'react'
import { saveRoiAssumptions } from '@/app/actions/settings'
import { Badge, Card, Notice } from '@/components/ui'
import { computeRoi, formatWon } from '@/lib/metrics'
import type { RoiAssumptions } from '@/lib/types'

/**
 * ROI 계산기 — 제안서 7-1 / 7-2의 산식을 그대로 구현한다.
 * 모든 전제값은 제안서가 '확정 시점'을 명시한 미확정값이므로 화면에서 수정할 수 있게 노출한다.
 */
const FIELDS: {
  key: keyof RoiAssumptions
  label: string
  unit: string
  status: string
  step?: number
}[] = [
  { key: 'hoursPerCall', label: '공모 1건당 담당자 투입시간', unit: '시간', status: '1단계 실측으로 확정' },
  { key: 'reductionRate', label: 'AI 적용 후 절감률', unit: '%', status: '3단계 실증으로 검증' },
  { key: 'callsPerYear', label: '연간 공모 대응 건수', unit: '건', status: '착수 시 확인' },
  { key: 'hourlyCost', label: '담당자 시간당 인건비 환산', unit: '원', status: '군 기준 적용', step: 1000 },
  {
    key: 'outsourcingCostPerCall',
    label: '외주 1건 평균 금액',
    unit: '원',
    status: '가정치 — 최근 3년 발주 실적으로 확정 필요',
    step: 1000000,
  },
  { key: 'projectCost', label: '1단계 사업비', unit: '원', status: '제안서 확정값', step: 1000000 },
]

export function RoiCalculator({ assumptions }: { assumptions: RoiAssumptions }) {
  const [values, setValues] = useState<RoiAssumptions>(assumptions)
  const [saved, setSaved] = useState(false)
  const roi = computeRoi(values)

  const dirty = FIELDS.some((f) => values[f.key] !== assumptions[f.key])

  return (
    <Card
      title="투자 회수 계산 (제안서 7-1 · 7-2)"
      desc="모든 전제값은 확정 시점이 명시된 미확정값입니다. 값을 바꾸면 세 시나리오가 즉시 재계산됩니다."
      action={
        <form action={saveRoiAssumptions}>
          {FIELDS.map((f) => (
            <input key={f.key} type="hidden" name={f.key} value={values[f.key]} />
          ))}
          <button
            type="submit"
            onClick={() => setSaved(true)}
            disabled={!dirty}
            className="rounded bg-ink-800 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-ink-900 disabled:bg-ink-300"
          >
            {dirty ? '전제값 저장' : saved ? '저장됨' : '변경 없음'}
          </button>
        </form>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-2.5">
          <p className="text-[11px] font-semibold text-ink-600">전제값</p>
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-medium text-ink-700">{f.label}</span>
                <span className="text-[10px] text-ink-400">{f.unit}</span>
              </label>
              <input
                type="number"
                min={0}
                step={f.step ?? 1}
                value={values[f.key]}
                onChange={(e) => setValues({ ...values, [f.key]: Number(e.target.value) || 0 })}
                className="w-full rounded border border-ink-300 px-2.5 py-1.5 text-right font-mono text-[13px] outline-none focus:border-gov-500 focus:ring-2 focus:ring-gov-500/15"
              />
              <p className="mt-0.5 text-[10px] text-warn-600">{f.status}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="rounded border border-ink-200 bg-ink-50 px-4 py-3">
            <p className="text-[11px] font-semibold text-ink-600">산출 과정</p>
            <p className="mt-1.5 font-mono text-[11.5px] leading-relaxed text-ink-600">
              건당 절감 {values.hoursPerCall}시간 × {values.reductionRate}% ={' '}
              <strong className="text-ink-900">{roi.hoursSavedPerCall.toFixed(1)}시간</strong>
              <br />
              연간 절감 {roi.hoursSavedPerCall.toFixed(1)}시간 × {values.callsPerYear}건 ={' '}
              <strong className="text-ink-900">
                {roi.hoursSavedPerYear.toFixed(0)}시간 ({roi.daysSavedPerYear.toFixed(1)}일)
              </strong>
              <br />
              인건비 환산 {roi.hoursSavedPerYear.toFixed(0)}시간 × {values.hourlyCost.toLocaleString()}원 ={' '}
              <strong className="text-ink-900">{formatWon(roi.annualTimeSaving)}</strong>
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-ink-200 text-left text-[11px] text-ink-500">
                  <th className="py-2 pr-3 font-semibold">시나리오</th>
                  <th className="py-2 pr-3 text-right font-semibold">외주 절감</th>
                  <th className="py-2 pr-3 text-right font-semibold">시간 절감</th>
                  <th className="py-2 pr-3 text-right font-semibold">연 합계</th>
                  <th className="py-2 text-right font-semibold">회수 시점</th>
                </tr>
              </thead>
              <tbody>
                {roi.scenarios.map((s) => (
                  <tr key={s.key} className="border-b border-ink-100 last:border-0">
                    <td className="py-2.5 pr-3">
                      <p className="font-semibold text-ink-800">{s.label}</p>
                      <p className="text-[10px] text-ink-400">{s.description}</p>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono text-ink-600">
                      {s.outsourcingSaving ? formatWon(s.outsourcingSaving) : '0원'}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono text-ink-600">{formatWon(s.timeSaving)}</td>
                    <td className="py-2.5 pr-3 text-right font-mono font-bold text-ink-900">
                      {formatWon(s.totalAnnual)}
                    </td>
                    <td className="py-2.5 text-right">
                      {s.paybackMonths !== null ? (
                        <Badge tone={s.paybackMonths <= 12 ? 'ok' : 'warn'}>{s.paybackMonths}개월</Badge>
                      ) : (
                        <span className="text-ink-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Notice tone="warn">
            외주 1건 평균 금액은 제안서가 <strong>&ldquo;가정&rdquo;</strong>이라고 명시한 값입니다. 함평군 최근 3년
            제안서 외주 발주 실적으로 확정해야 이 표의 &lsquo;중간&rsquo;·&lsquo;적극&rsquo; 시나리오가 근거를 갖습니다
            (제안서 8-2 협의사항 4번).
          </Notice>
        </div>
      </div>
    </Card>
  )
}
