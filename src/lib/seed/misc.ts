/**
 * 진단·성과·교육·설정 시드
 *
 * 게이트①(제안서 5-1)의 3개 조건은 "아직 달성되지 않은 상태"로 시작한다.
 * 착수 전 상태를 그대로 보여주는 것이 제안서의 안전장치 설계와 일치하기 때문이다.
 */
import type {
  Announcement,
  AuditEntry,
  DiagnosisAxis,
  MetricRecord,
  Settings,
  TrainingRecord,
} from '../types'

const T = '2026-08-03T00:00:00.000Z'

/** 제안서 3-1 — 공개 자료 기준 사전진단. 착수 시 현장 검증으로 확정한다. */
export function seedDiagnosis(): DiagnosisAxis[] {
  return [
    {
      key: 'work',
      label: '업무',
      current: 2.0,
      target: 3.5,
      basis: '반복 업무의 표준 절차 문서화가 확인되지 않음',
      status: 'pre-diagnosis',
    },
    {
      key: 'data',
      label: '데이터',
      current: 2.0,
      target: 3.5,
      basis: '원천 자료는 풍부하나 부서별 분산, 통합 검색 형태 미확인',
      status: 'pre-diagnosis',
    },
    {
      key: 'org',
      label: '조직',
      current: 2.0,
      target: 3.5,
      basis: 'AI·데이터 전담 조직 또는 담당관 지정이 조례상 확인되지 않음',
      status: 'pre-diagnosis',
    },
    {
      key: 'tech',
      label: '기술',
      current: 3.0,
      target: 3.5,
      basis: '스마트농업(56억 원) 등 데이터 기반 사업 실집행 — 투자 의지·집행 경험 있음',
      status: 'pre-diagnosis',
    },
    {
      key: 'gov',
      label: '거버넌스',
      current: 1.5,
      target: 3.5,
      basis: 'AI 활용 지침·검토 절차·이력 관리 기준의 공개 근거 없음',
      status: 'pre-diagnosis',
    },
  ]
}

/**
 * 성과 측정 시드
 *
 * 제안서 2-2가 "현행 40시간은 예시이며 1단계 현황 파악에서 실측하여 확정한다"고
 * 명시했으므로, 현행값은 measurement: 'manual' + note로 가정임을 밝혀 둔다.
 * 개선(after) 실측치는 앱 사용을 통해 자동으로 쌓인다.
 */
export function seedMetrics(): MetricRecord[] {
  return [
    {
      id: 'M-BASE-1',
      taskType: '공고 분석·평가항목 정리',
      mode: 'before',
      minutes: 480,
      staff: '기준값',
      measurement: 'manual',
      note: '제안서 2-2 기재 예시값(1일). 1단계 현황 파악에서 실측 확정 필요.',
      recordedAt: T,
    },
    {
      id: 'M-BASE-2',
      taskType: '함평군 근거자료 수집',
      mode: 'before',
      minutes: 720,
      staff: '기준값',
      measurement: 'manual',
      note: '제안서 2-2 기재 예시값(1.5일). 1단계 현황 파악에서 실측 확정 필요.',
      recordedAt: T,
    },
    {
      id: 'M-BASE-3',
      taskType: '초안 작성',
      mode: 'before',
      minutes: 960,
      staff: '기준값',
      measurement: 'manual',
      note: '제안서 2-2 기재 예시값(2일, 담당자 직접 작성 기준). 실측 확정 필요.',
      recordedAt: T,
    },
    {
      id: 'M-BASE-4',
      taskType: '검토·보완',
      mode: 'before',
      minutes: 240,
      staff: '기준값',
      measurement: 'manual',
      note: '제안서 2-2 기재 예시값(0.5일). 실측 확정 필요.',
      recordedAt: T,
    },
  ]
}

/** 게이트① 조건 ㉰ — 교육 이수자 2명 이상 단독 수행 가능. 착수 전이므로 빈 상태. */
export function seedTraining(): TrainingRecord[] {
  return []
}

export function seedAnnouncements(): Announcement[] {
  return []
}

export function seedAudit(): AuditEntry[] {
  return [
    {
      id: 'AU-SEED',
      at: T,
      actor: '시스템',
      action: '시스템 초기화',
      target: '자료 창고',
      detail: '제안서 기반 시드 문서 28건 적재. 데이터 등급 1~2등급만 등록됨.',
    },
  ]
}

export function seedSettings(): Settings {
  return {
    aiMode: 'demo',
    anthropicApiKey: '',
    anthropicModel: 'claude-sonnet-5',
    localBaseUrl: 'http://localhost:11434/v1',
    localModel: 'gemma4',
    currentUser: '기획예산실 담당자',
    roi: {
      // 제안서 7-1의 전제값. 모두 '확정 시점'이 명시된 미확정값이다.
      hoursPerCall: 40,
      reductionRate: 55,
      callsPerYear: 12,
      hourlyCost: 30000,
      outsourcingCostPerCall: 40000000,
      projectCost: 20000000,
    },
    updatedAt: T,
  }
}
