import { RoiCalculator } from './RoiCalculator'
import { TrainingForm } from './TrainingForm'
import { recordManualTime } from '@/app/actions/drafts'
import { Badge, Card, Notice, PageHeader, Progress } from '@/components/ui'
import { read } from '@/lib/db'
import { evaluateGate1, formatMinutes, summarizeTime } from '@/lib/metrics'

export const dynamic = 'force-dynamic'

const TASK_TYPES = [
  '공고 분석·평가항목 정리',
  '함평군 근거자료 수집',
  '초안 작성',
  '검토·보완',
  '숫자·근거 검증',
] as const

export default async function MetricsPage() {
  const [metrics, documents, training, settings] = await Promise.all([
    read('metrics'),
    read('documents'),
    read('training'),
    read('settings'),
  ])

  const time = summarizeTime(metrics)
  const gate = evaluateGate1({ documents, metrics, training })
  const reduction = gate.conditions.find((c) => c.key === 'reduction')!

  // 담당자 실투입(수동 실측)과 AI 처리 시간(자동 계측)은 다른 값이므로 분리해 집계한다
  const byType = TASK_TYPES.map((t) => {
    const before = metrics.filter((m) => m.taskType === t && m.mode === 'before')
    const after = metrics.filter((m) => m.taskType === t && m.mode === 'after' && m.measurement === 'manual')
    const ai = metrics.filter((m) => m.taskType === t && m.mode === 'after' && m.measurement === 'auto')
    const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null)
    const b = avg(before.map((m) => m.minutes))
    const a = avg(after.map((m) => m.minutes))
    return {
      t,
      before: b,
      after: a,
      ai: avg(ai.map((m) => m.minutes)),
      beforeN: before.length,
      afterN: after.length,
      aiN: ai.length,
      rate: b && a !== null ? Math.round(((b - a) / b) * 1000) / 10 : null,
    }
  })

  return (
    <>
      <PageHeader
        eyebrow="관리"
        title="성과 측정 · 투자 회수"
        help="metrics"
        desc={
          <>
            제안서 7-1은 정량 효과의 전제값을 모두 &ldquo;확정 시점&rdquo;과 함께 밝혔습니다. 이 화면도 같은 원칙을
            따릅니다 — 실측되지 않은 값은 실측되지 않았다고 표시하고, 확정되지 않은 전제는 수정 가능한 입력값으로
            노출합니다.
          </>
        }
      />

      <div className="mb-5">
        <Notice tone={reduction.passed ? 'ok' : 'warn'}>
          <strong>게이트① ㉮ 작성시간 50% 이상 단축 실측 확인</strong> — {reduction.currentText} / {reduction.targetText}
          <br />
          {reduction.detail}
        </Notice>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card
          title="작업 유형별 담당자 실투입 시간"
          desc="절감률은 담당자 실투입 기준으로만 산출합니다. AI 처리 시간(자동 계측)은 검토·보완 시간을 포함하지 않으므로 참고값으로만 표시합니다."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-ink-200 text-left text-[11px] text-ink-500">
                  <th className="py-2 pr-3 font-semibold">작업</th>
                  <th className="py-2 pr-3 text-right font-semibold">현행</th>
                  <th className="py-2 pr-3 text-right font-semibold">개선 (실투입)</th>
                  <th className="py-2 pr-3 text-right font-semibold">절감률</th>
                  <th className="py-2 text-right font-semibold text-ink-400">AI 처리시간</th>
                </tr>
              </thead>
              <tbody>
                {byType.map((r) => (
                  <tr key={r.t} className="border-b border-ink-100 last:border-0">
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-ink-800">{r.t}</p>
                      <p className="text-[10px] text-ink-400">
                        표본 현행 {r.beforeN}건 / 개선 {r.afterN}건
                      </p>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono text-ink-600">
                      {r.before !== null ? formatMinutes(r.before) : '—'}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono text-gov-600">
                      {r.after !== null ? formatMinutes(r.after) : '미실측'}
                    </td>
                    <td className="py-2.5 pr-3 text-right">
                      {r.rate !== null ? (
                        <span className={`font-mono font-bold ${r.rate >= 50 ? 'text-ok-600' : 'text-warn-600'}`}>
                          {r.rate}%
                        </span>
                      ) : (
                        <span className="text-[11px] text-ink-400">산출 불가</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-mono text-[11px] text-ink-400">
                      {r.ai !== null ? `${formatMinutes(r.ai)} (${r.aiN}회)` : '—'}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-ink-200 font-semibold">
                  <td className="py-2.5 pr-3 text-ink-800">합계 (개선 실측이 있는 작업만)</td>
                  <td className="py-2.5 pr-3 text-right font-mono text-ink-700">
                    {time.beforeMinutes ? formatMinutes(time.beforeMinutes) : '—'}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono text-gov-600">
                    {time.afterMinutes ? formatMinutes(time.afterMinutes) : '—'}
                  </td>
                  <td className="py-2.5 pr-3 text-right">
                    {time.reductionRate !== null ? (
                      <span
                        className={`font-mono font-bold ${time.reductionRate >= 50 ? 'text-ok-600' : 'text-warn-600'}`}
                      >
                        {time.reductionRate}%
                      </span>
                    ) : (
                      <span className="text-[11px] text-ink-400">산출 불가</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right font-mono text-[11px] text-ink-400">
                    {time.aiSamples ? `${formatMinutes(time.aiMinutes)} / ${time.aiSamples}회` : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {time.reductionRate !== null && (
            <div className="mt-3">
              <Progress value={time.reductionRate / 100} tone={time.reductionRate >= 50 ? 'ok' : 'warn'} />
            </div>
          )}
          <div className="mt-3">
            <Notice tone="warn">
              AI 처리 시간이 짧다는 것과 담당자 업무가 줄었다는 것은 다른 이야기입니다. 제안서 2-2도 개선 후 담당자
              실투입을 <strong>18시간</strong>으로 잡았습니다 — 작성 시간은 줄지만 검토·보완 시간은 오히려 늘기
              때문입니다. 게이트①은 담당자 실투입 기준으로만 판정합니다.
            </Notice>
          </div>
        </Card>

        <Card title="소요시간 직접 입력" desc="제안서 4-2 1단계 — 담당자 면담을 통한 소요시간 실측을 기록합니다.">
          <form action={recordManualTime} className="space-y-2.5">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-ink-600">작업 유형</label>
              <select
                name="taskType"
                className="w-full rounded border border-ink-300 px-2.5 py-1.5 text-[13px] outline-none focus:border-gov-500"
              >
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-ink-600">구분</label>
                <select
                  name="mode"
                  className="w-full rounded border border-ink-300 px-2.5 py-1.5 text-[13px] outline-none focus:border-gov-500"
                >
                  <option value="before">현행 (AI 미적용)</option>
                  <option value="after">개선 (AI 적용)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-ink-600">소요 시간 (분)</label>
                <input
                  name="minutes"
                  type="number"
                  min={1}
                  required
                  className="w-full rounded border border-ink-300 px-2.5 py-1.5 text-[13px] outline-none focus:border-gov-500"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-ink-600">메모</label>
              <input
                name="note"
                placeholder="예: 기획예산실 담당자 면담 실측"
                className="w-full rounded border border-ink-300 px-2.5 py-1.5 text-[13px] outline-none focus:border-gov-500"
              />
            </div>
            <button className="w-full rounded bg-ink-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-ink-900">
              실측 기록
            </button>
          </form>
        </Card>
      </div>

      <div className="mb-5">
        <RoiCalculator assumptions={settings.roi} />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <TrainingForm />

        <Card title="교육 이수 현황" desc="게이트① ㉰ — 기본·심화를 모두 이수하고 단독 수행이 가능한 인원만 집계합니다.">
          {training.length === 0 ? (
            <p className="text-[12px] text-ink-400">
              아직 교육 이수 기록이 없습니다. 제안서 4-2 4단계(9~10주차)에서 기본 3시간·심화 3시간 교육 2회를
              시행합니다.
            </p>
          ) : (
            <ul className="space-y-2">
              {training.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 pb-2 last:border-0">
                  <div>
                    <p className="text-[12.5px] font-semibold text-ink-800">
                      {t.name} <span className="font-normal text-ink-400">{t.department}</span>
                    </p>
                    {t.note && <p className="text-[11px] text-ink-500">{t.note}</p>}
                  </div>
                  <div className="flex gap-1.5">
                    <Badge tone={t.basicDone ? 'ok' : 'neutral'}>기본 {t.basicDone ? '이수' : '미이수'}</Badge>
                    <Badge tone={t.advancedDone ? 'ok' : 'neutral'}>심화 {t.advancedDone ? '이수' : '미이수'}</Badge>
                    <Badge tone={t.soloCapable ? 'ok' : 'warn'}>{t.soloCapable ? '단독 수행 가능' : '단독 수행 불가'}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="측정 기록" desc="자동 계측(auto)과 담당자 실측 입력(manual)을 구분해 기록합니다.">
        {metrics.length === 0 ? (
          <p className="text-[12px] text-ink-400">기록이 없습니다.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-[11.5px]">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-ink-200 text-left text-[11px] text-ink-500">
                  <th className="py-2 pr-3 font-semibold">일시</th>
                  <th className="py-2 pr-3 font-semibold">작업</th>
                  <th className="py-2 pr-3 font-semibold">구분</th>
                  <th className="py-2 pr-3 text-right font-semibold">시간</th>
                  <th className="py-2 font-semibold">비고</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m.id} className="border-b border-ink-100 last:border-0">
                    <td className="py-2 pr-3 font-mono text-ink-400">{m.recordedAt.slice(0, 10)}</td>
                    <td className="py-2 pr-3 text-ink-700">{m.taskType}</td>
                    <td className="py-2 pr-3">
                      <Badge tone={m.mode === 'before' ? 'neutral' : 'gov'}>
                        {m.mode === 'before' ? '현행' : '개선'}
                      </Badge>
                      <span className="ml-1 text-[10px] text-ink-400">
                        {m.measurement === 'auto' ? '자동' : '수동'}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-ink-700">{formatMinutes(m.minutes)}</td>
                    <td className="py-2 text-ink-500">{m.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
