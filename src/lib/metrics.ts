/**
 * 성과 측정 및 게이트 판정 — 제안서 5-1, 7-1, 7-2
 *
 * 게이트①은 "시간이 아니라 조건으로" 넘어간다.
 * 이 모듈은 그 조건을 계산할 뿐이며, 조건이 충족되지 않으면 충족되지 않았다고 그대로 보고한다.
 */
import type { MetricRecord, RoiAssumptions, StoredDocument, TrainingRecord } from './types'

export const GATE1_DOC_TARGET = 200
export const GATE1_REDUCTION_TARGET = 50
export const GATE1_TRAINEE_TARGET = 2

export interface TimeSaving {
  beforeMinutes: number
  afterMinutes: number
  reductionRate: number | null
  /** 개선 실측 표본 수 — 표본이 없으면 절감률을 산출할 수 없다 */
  afterSamples: number
  beforeSamples: number
  /** 참고 지표: 자동 계측된 AI 처리 시간 합계 (담당자 실투입과 다른 값이다) */
  aiMinutes: number
  aiSamples: number
}

/**
 * 작업 유형별로 현행/개선 평균을 내고 합산한다.
 *
 * 중요 — 게이트①의 절감률은 **담당자 실투입 시간** 기준이다.
 * 자동 계측값(measurement: 'auto')은 AI가 처리하는 데 걸린 시간일 뿐,
 * 담당자가 초안을 검토하고 보완하는 시간을 포함하지 않는다.
 * 자동 계측값을 절감률에 넣으면 "16시간 → 1분, 99.9% 단축" 같은 무의미한 수치가 나온다.
 * 제안서 2-2가 개선 후에도 담당자 실투입을 18시간으로 잡은 이유가 이것이다 —
 * 줄어드는 것은 작성 시간이고, 검토 시간은 오히려 늘어난다.
 * 따라서 절감률은 담당자가 직접 실측해 입력한 값(manual)으로만 산출한다.
 */
export function summarizeTime(metrics: MetricRecord[]): TimeSaving {
  const byType = new Map<string, { before: number[]; after: number[] }>()
  for (const m of metrics) {
    if (m.mode === 'after' && m.measurement === 'auto') continue // AI 처리 시간은 별도 집계
    const slot = byType.get(m.taskType) ?? { before: [], after: [] }
    slot[m.mode].push(m.minutes)
    byType.set(m.taskType, slot)
  }

  let beforeTotal = 0
  let afterTotal = 0
  let beforeSamples = 0
  let afterSamples = 0

  for (const { before, after } of byType.values()) {
    const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0)
    // 개선 실측이 있는 작업만 비교 대상으로 삼는다. 그래야 절감률이 부풀지 않는다.
    if (before.length && after.length) {
      beforeTotal += avg(before)
      afterTotal += avg(after)
    }
    beforeSamples += before.length
    afterSamples += after.length
  }

  const autoRecords = metrics.filter((m) => m.mode === 'after' && m.measurement === 'auto')
  const reductionRate =
    beforeTotal > 0 && afterSamples > 0 ? ((beforeTotal - afterTotal) / beforeTotal) * 100 : null

  return {
    beforeMinutes: Math.round(beforeTotal),
    afterMinutes: Math.round(afterTotal),
    reductionRate: reductionRate === null ? null : Math.round(reductionRate * 10) / 10,
    afterSamples,
    beforeSamples,
    aiMinutes: autoRecords.reduce((s, m) => s + m.minutes, 0),
    aiSamples: autoRecords.length,
  }
}

export interface GateCondition {
  key: string
  label: string
  detail: string
  currentText: string
  targetText: string
  progress: number
  passed: boolean
}

export interface GateStatus {
  conditions: GateCondition[]
  passed: boolean
  verdict: string
}

/** 게이트① 판정 — 제안서 5-1 */
export function evaluateGate1(params: {
  documents: StoredDocument[]
  metrics: MetricRecord[]
  training: TrainingRecord[]
}): GateStatus {
  const { documents, metrics, training } = params
  const time = summarizeTime(metrics)
  const soloCapable = training.filter((t) => t.basicDone && t.advancedDone && t.soloCapable).length

  const reductionPassed = time.reductionRate !== null && time.reductionRate >= GATE1_REDUCTION_TARGET
  const docsPassed = documents.length >= GATE1_DOC_TARGET
  const trainingPassed = soloCapable >= GATE1_TRAINEE_TARGET

  const conditions: GateCondition[] = [
    {
      key: 'reduction',
      label: '㉮ 작성시간 50% 이상 단축 실측 확인',
      detail:
        time.reductionRate === null
          ? '담당자 실투입 시간의 개선 실측 기록이 없어 절감률을 산출할 수 없습니다. AI 처리 시간은 자동 계측되지만, 검토·보완 시간이 빠져 있어 절감률의 근거가 될 수 없습니다. 성과 측정 화면에서 실투입 시간을 직접 입력하십시오.'
          : `현행 평균 ${time.beforeMinutes}분 → 개선 평균 ${time.afterMinutes}분 (담당자 실측 ${time.afterSamples}건)`,
      currentText: time.reductionRate === null ? '산출 불가' : `${time.reductionRate}%`,
      targetText: `${GATE1_REDUCTION_TARGET}%`,
      progress: time.reductionRate === null ? 0 : Math.min(1, Math.max(0, time.reductionRate / GATE1_REDUCTION_TARGET)),
      passed: reductionPassed,
    },
    {
      key: 'documents',
      label: '㉯ 자료 창고 200건 이상',
      detail: '데이터 등급 1·2등급 문서만 집계합니다. 3·4등급은 등록 자체가 차단됩니다.',
      currentText: `${documents.length}건`,
      targetText: `${GATE1_DOC_TARGET}건`,
      progress: Math.min(1, documents.length / GATE1_DOC_TARGET),
      passed: docsPassed,
    },
    {
      key: 'training',
      label: '㉰ 교육 이수자 2명 이상 단독 수행 가능',
      detail: '기본 3시간·심화 3시간을 모두 이수하고 단독 수행이 확인된 인원만 집계합니다.',
      currentText: `${soloCapable}명`,
      targetText: `${GATE1_TRAINEE_TARGET}명`,
      progress: Math.min(1, soloCapable / GATE1_TRAINEE_TARGET),
      passed: trainingPassed,
    },
  ]

  const passed = conditions.every((c) => c.passed)
  return {
    conditions,
    passed,
    verdict: passed
      ? '게이트① 3개 조건을 모두 충족했습니다. 2단계 논의가 가능합니다.'
      : '게이트① 미충족 — 2단계로 진행하지 않습니다. 제안서 5-1에 따라 1단계에서 사업을 멈출 수 있습니다.',
  }
}

// ─────────────────────────────────────────────────────────────
// ROI — 제안서 7-1 / 7-2
// ─────────────────────────────────────────────────────────────
export interface RoiScenario {
  key: 'conservative' | 'moderate' | 'aggressive'
  label: string
  description: string
  outsourcingSaving: number
  timeSaving: number
  totalAnnual: number
  /** 회수 개월 수. 연 절감액이 0이면 null */
  paybackMonths: number | null
}

export interface RoiResult {
  hoursSavedPerCall: number
  hoursSavedPerYear: number
  daysSavedPerYear: number
  annualTimeSaving: number
  scenarios: RoiScenario[]
}

export function computeRoi(a: RoiAssumptions): RoiResult {
  const hoursSavedPerCall = (a.hoursPerCall * a.reductionRate) / 100
  const hoursSavedPerYear = hoursSavedPerCall * a.callsPerYear
  const annualTimeSaving = hoursSavedPerYear * a.hourlyCost

  const build = (
    key: RoiScenario['key'],
    label: string,
    description: string,
    outsourcedCalls: number,
  ): RoiScenario => {
    const outsourcingSaving = outsourcedCalls * a.outsourcingCostPerCall
    const totalAnnual = outsourcingSaving + annualTimeSaving
    return {
      key,
      label,
      description,
      outsourcingSaving,
      timeSaving: annualTimeSaving,
      totalAnnual,
      // 제안서 7-2의 회수 시점(30·9·5개월)과 일치하도록 반올림한다
      paybackMonths: totalAnnual > 0 ? Math.round((a.projectCost / totalAnnual) * 12) : null,
    }
  }

  return {
    hoursSavedPerCall,
    hoursSavedPerYear,
    daysSavedPerYear: hoursSavedPerYear / 8,
    annualTimeSaving,
    scenarios: [
      build('conservative', '보수적', '외주 그대로, 시간만 절감', 0),
      build('moderate', '중간', '연 1건 일부 자체 작성 (외주비 절반 절감)', 0.5),
      build('aggressive', '적극', '연 1건 전부 자체 작성', 1),
    ],
  }
}

export function formatWon(v: number): string {
  if (!isFinite(v)) return '-'
  const man = Math.round(v / 10000)
  if (man >= 10000) {
    const eok = Math.floor(man / 10000)
    const rest = man % 10000
    return rest ? `${eok}억 ${rest.toLocaleString()}만 원` : `${eok}억 원`
  }
  return `${man.toLocaleString()}만 원`
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)}분`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m ? `${h}시간 ${m}분` : `${h}시간`
}
