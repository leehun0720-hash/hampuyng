/**
 * 함평군 행정 AX 시스템 도메인 타입
 *
 * 제안서(함평군_행정AX_1단계_사업제안서_최종.pdf)의 용어와 제약을 그대로 반영한다.
 * 특히 데이터 등급(5-2)과 검토 절차(5-2 ㉰)는 타입 수준에서부터 강제한다.
 */

// ─────────────────────────────────────────────────────────────
// 데이터 등급 — 제안서 5-2
// 1등급 공개자료 / 2등급 내부자료(비식별 후 활용) → 본 사업 취급 대상
// 3등급 대외비 / 4등급 개인정보 → 본 사업에서 일절 다루지 않음 (3단계 이후)
// ─────────────────────────────────────────────────────────────
export type DataGrade = 1 | 2 | 3 | 4

export const DATA_GRADES: Record<DataGrade, { label: string; desc: string; allowed: boolean }> = {
  1: { label: '1등급 · 공개자료', desc: '군청 홈페이지·통계포털 등 이미 공개된 자료', allowed: true },
  2: { label: '2등급 · 내부자료', desc: '부서 보유 내부 문서 — 비식별 조치 후 활용', allowed: true },
  3: { label: '3등급 · 대외비', desc: '본 사업 범위 외 — 내부 설치형 체계 확보 후(3단계)', allowed: false },
  4: { label: '4등급 · 개인정보', desc: '본 사업 범위 외 — 개인정보 영향평가 완료 후(3단계)', allowed: false },
}

/** 등급 게이트: 3·4등급은 등록 자체를 차단한다. */
export function isGradeAllowed(grade: number): grade is 1 | 2 {
  return grade === 1 || grade === 2
}

// ─────────────────────────────────────────────────────────────
// 자료 창고 — 제안서 4-1 결과물 ②
// ─────────────────────────────────────────────────────────────
export type DocCategory =
  | '인구·통계'
  | '재정·예산'
  | '공모·국고건의'
  | '선정실적'
  | '계획·정책'
  | '조직·행정'
  | '지역현안'
  | '제도·지침'
  | '과거제안서'

export const DOC_CATEGORIES: DocCategory[] = [
  '인구·통계',
  '재정·예산',
  '공모·국고건의',
  '선정실적',
  '계획·정책',
  '조직·행정',
  '지역현안',
  '제도·지침',
  '과거제안서',
]

export interface StoredDocument {
  id: string
  title: string
  category: DocCategory
  /** 원출처 표기 — 감사 대응 시 "이 수치 근거가 뭐죠?"에 답하는 근거 */
  source: string
  /** 기준 시점 (예: "2026. 5. 31.") */
  asOf?: string
  dataGrade: 1 | 2
  content: string
  tags: string[]
  /** 제안서 맺음말 원칙: 확인되지 않은 값은 '확인 필요'로 표시한다 */
  verificationStatus: 'verified' | 'needs-check' | 'assumption'
  verificationNote?: string
  createdAt: string
  updatedAt: string
}

// ─────────────────────────────────────────────────────────────
// 공고문 분석 — 제안서 2-2
// ─────────────────────────────────────────────────────────────
/** 근거 충족도 신호등 */
export type EvidenceLevel = 'strong' | 'partial' | 'none'

export interface EvidenceMatch {
  docId: string
  title: string
  source: string
  score: number
  snippet: string
}

export interface EvaluationItem {
  id: string
  /** 평가항목명 */
  name: string
  /** 배점 (없으면 null) */
  points: number | null
  /** 심사 착안점 */
  focus: string
  /** 필수요건 여부 */
  required: boolean
  /** 자료 창고에서 자동 매칭된 함평군 대응 근거 */
  evidence: EvidenceMatch[]
  evidenceLevel: EvidenceLevel
}

export interface Announcement {
  id: string
  title: string
  ministry: string
  /** 공모 사업명 */
  program: string
  deadline: string
  /** 총사업비 / 국비 규모 등 원문 기재 */
  budgetNote: string
  rawText: string
  evaluationItems: EvaluationItem[]
  /** 근거가 없어 보강이 필요한 항목 목록 */
  gapQueue: string[]
  analyzedAt: string | null
  /** 분석에 실제로 걸린 시간(초) — 게이트① 실측 근거 */
  elapsedSeconds: number | null
  aiMode: AiMode | null
  createdAt: string
}

// ─────────────────────────────────────────────────────────────
// 초안 — 표준 절차 7단계 (제안서 4-2 "표준 절차 7단계 수립")
// ─────────────────────────────────────────────────────────────
export interface DraftSection {
  step: number
  title: string
  /** 생성 원문 — [D1] 형식 인용 마커를 포함한다 */
  content: string
  /** content 안의 [Dn] 마커가 가리키는 문서 */
  citedDocIds: string[]
  /** 생성 당시 AI에 제시된 근거 목록. [Dn] 배지를 실제 문서로 되돌리는 데 쓴다. */
  usedDocs: { marker: string; id: string; title: string }[]
  /** 근거 없이 생성된 문장 수 — 검토 확인목록에서 차단 대상 */
  uncitedSentences: number
  status: 'empty' | 'generated' | 'edited' | 'confirmed'
  generatedAt: string | null
  editedAt: string | null
  aiMode: AiMode | null
}

export interface DraftEditLog {
  at: string
  actor: string
  step: number
  action: 'generate' | 'regenerate' | 'edit' | 'confirm'
  note: string
}

export interface Draft {
  id: string
  title: string
  announcementId: string | null
  announcementTitle: string
  sections: DraftSection[]
  editLog: DraftEditLog[]
  /** 검토 확인목록 통과 여부 — false면 제출 확정 불가 (제안서 5-2 ㉰) */
  reviewPassed: boolean
  submitted: boolean
  submittedAt: string | null
  /** 초안 작성에 실제로 걸린 시간(초) */
  elapsedSeconds: number
  createdAt: string
  updatedAt: string
}

/**
 * 표준 절차 7단계.
 *
 * `evidenceQuery`는 자료 창고 검색에 쓰는 단계별 주제어다.
 * 단계 제목만으로 검색하면 제목에 모든 단계명이 들어 있는 절차 문서가 모든 단계에서
 * 최상위로 올라와, 7개 단계가 똑같은 근거를 물어온다. 그래서 내용 주제어를 따로 둔다.
 */
export const DRAFT_STEPS: { step: number; title: string; guide: string; evidenceQuery: string }[] = [
  {
    step: 1,
    title: '사업 개요',
    guide: '사업명·사업기간·총사업비·수행주체를 표로 정리하고 한 문단으로 요약한다.',
    evidenceQuery: '사업 규모 총사업비 국비 억 원 위치 산업단지 대상 후보사업',
  },
  {
    step: 2,
    title: '추진 배경 및 필요성',
    guide: '함평군의 인구·재정 여건과 상위 정책을 근거로 왜 지금 이 사업이 필요한지 논증한다.',
    evidenceQuery: '인구 고령화율 재정자립도 여건 상위 정책 법령 지침 필요성 시급성 국비 지원',
  },
  {
    step: 3,
    title: '현황 및 문제점',
    guide: '현재 실태를 수치로 제시하고 구조적 한계를 항목화한다.',
    evidenceQuery: '현황 실태 통계 인구 감소 고령화 재정 한계 문제 구조적 어려움 격차',
  },
  {
    step: 4,
    title: '사업 목표',
    guide: '정량 목표와 정성 목표를 분리해 제시하고 측정 방법을 명시한다.',
    evidenceQuery: '목표 지표 성과 측정 기준값 달성 정량 정성',
  },
  {
    step: 5,
    title: '사업 내용 및 추진 방법',
    guide: '세부 과제를 단계별로 나누고 추진 체계·역할 분담을 기술한다.',
    evidenceQuery: '추진 실적 선정 인프라 산업단지 연계 사업 집행 경험 스마트 데이터 기반',
  },
  {
    step: 6,
    title: '소요 예산 및 추진 일정',
    guide: '국비·도비·군비 분담과 연차별 투입 계획을 표로 제시한다.',
    evidenceQuery: '예산 사업비 국비 도비 군비 단가 산출 내역 재정 분담 일정',
  },
  {
    step: 7,
    title: '기대효과 및 성과지표',
    guide: '정량 효과는 산식과 함께, 정성 효과는 파급 경로와 함께 기술한다.',
    evidenceQuery: '기대효과 정량 효과 산식 전제 절감 회수 성과지표 정성 효과 파급',
  },
]

// ─────────────────────────────────────────────────────────────
// 지시문 30종 — 제안서 4-1 결과물 ③
// ─────────────────────────────────────────────────────────────
export type PromptCategory = '공고분석' | '자료수집' | '초안작성' | '검토보완' | '사후관리'

export const PROMPT_CATEGORIES: PromptCategory[] = ['공고분석', '자료수집', '초안작성', '검토보완', '사후관리']

export interface PromptTemplate {
  id: string
  no: number
  category: PromptCategory
  title: string
  purpose: string
  body: string
  /** {{변수}} 목록 */
  variables: string[]
  /** 표준 절차 7단계 중 연결 단계 (없으면 null) */
  linkedStep: number | null
  useCount: number
  custom: boolean
}

// ─────────────────────────────────────────────────────────────
// 검토 확인목록 — 제안서 5-2 ㉰
// ─────────────────────────────────────────────────────────────
export interface ChecklistItem {
  id: string
  label: string
  detail: string
  /** 시스템이 자동 판정하는 항목인지 (자동 항목은 사람이 임의로 통과시킬 수 없다) */
  auto: boolean
  checked: boolean
  autoResult?: { pass: boolean; message: string }
}

export interface ReviewRecord {
  id: string
  draftId: string
  reviewer: string
  reviewedAt: string
  checklist: ChecklistItem[]
  passed: boolean
  comment: string
}

// ─────────────────────────────────────────────────────────────
// 성과 측정 — 제안서 5-1 게이트① / 7-1
// ─────────────────────────────────────────────────────────────
export type MetricTaskType = '공고 분석·평가항목 정리' | '함평군 근거자료 수집' | '초안 작성' | '검토·보완' | '숫자·근거 검증'

export interface MetricRecord {
  id: string
  taskType: MetricTaskType
  /** before = 현행(AI 미적용), after = 개선(AI 적용) */
  mode: 'before' | 'after'
  minutes: number
  staff: string
  /** 자동 계측인지 수동 입력인지 — 게이트① "실측 확인"의 신뢰도 근거 */
  measurement: 'auto' | 'manual'
  note: string
  recordedAt: string
}

export interface RoiAssumptions {
  hoursPerCall: number
  reductionRate: number
  callsPerYear: number
  hourlyCost: number
  outsourcingCostPerCall: number
  projectCost: number
}

// ─────────────────────────────────────────────────────────────
// 5축 AX 진단 — 제안서 3-1
// ─────────────────────────────────────────────────────────────
export interface DiagnosisAxis {
  key: string
  label: string
  current: number
  target: number
  basis: string
  /** 사전진단(공개자료 기준) 값인지, 착수 후 현장 검증된 값인지 */
  status: 'pre-diagnosis' | 'field-verified'
}

// ─────────────────────────────────────────────────────────────
// 교육 이수 — 게이트① 조건 ㉰
// ─────────────────────────────────────────────────────────────
export interface TrainingRecord {
  id: string
  name: string
  department: string
  /** 기본 3시간 / 심화 3시간 (제안서 4-2 4단계) */
  basicDone: boolean
  advancedDone: boolean
  /** 단독 수행 가능 여부 — 게이트① 통과 조건 */
  soloCapable: boolean
  note: string
}

// ─────────────────────────────────────────────────────────────
// 감사 이력 — 제안서 5-2
// ─────────────────────────────────────────────────────────────
export interface AuditEntry {
  id: string
  at: string
  actor: string
  action: string
  target: string
  detail: string
  aiMode?: AiMode
}

// ─────────────────────────────────────────────────────────────
// AI 설정 — 제안서 4-4
// ─────────────────────────────────────────────────────────────
export type AiMode = 'demo' | 'anthropic' | 'local'

export const AI_MODE_LABELS: Record<AiMode, string> = {
  demo: '데모 모드 (규칙 기반 · 외부 전송 없음)',
  anthropic: 'Claude API (외부 상용 AI)',
  local: '로컬 설치형 (젬마4 등 · 내부망)',
}

export interface Settings {
  aiMode: AiMode
  anthropicApiKey: string
  anthropicModel: string
  localBaseUrl: string
  localModel: string
  /** 현재 로그인 담당자 (인증 없이 이름만 기록 — 감사 이력용) */
  currentUser: string
  roi: RoiAssumptions
  updatedAt: string
}
