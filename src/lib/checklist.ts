/**
 * 검토 확인목록 — 제안서 5-2 ㉰
 * "검토 확인목록 통과 없이 제출 불가, 검토 이력 자동 기록"
 *
 * 자동 판정 항목(auto: true)은 시스템이 검사하며, 사람이 임의로 통과 처리할 수 없다.
 * 수동 항목은 담당자가 실제로 확인한 뒤 체크한다.
 */
import { countUncitedInDraft } from './citations'
import type { Announcement, ChecklistItem, Draft } from './types'

export function buildChecklist(draft: Draft, announcement: Announcement | undefined): ChecklistItem[] {
  const filled = draft.sections.filter((s) => s.status !== 'empty')
  // 저장값이 아니라 본문에서 다시 센다 — 제출 차단 판정의 근거이기 때문이다
  const uncited = countUncitedInDraft(draft.sections)
  const citedCount = new Set(draft.sections.flatMap((s) => s.citedDocIds)).size

  // 평가항목명이 초안 본문 어딘가에 등장하는지로 대응 여부를 근사 판정한다.
  const allText = draft.sections.map((s) => s.content).join('\n')
  const uncovered = (announcement?.evaluationItems ?? []).filter((item) => {
    const keys = item.name.split(/[\s·및]+/).filter((k) => k.length >= 2)
    return keys.length > 0 && !keys.some((k) => allText.includes(k))
  })

  const items: ChecklistItem[] = [
    {
      id: 'sections',
      label: '표준 절차 7단계를 모두 작성했는가',
      detail: '비어 있는 단계가 있으면 제출할 수 없습니다.',
      auto: true,
      checked: filled.length === 7,
      autoResult: {
        pass: filled.length === 7,
        message:
          filled.length === 7
            ? '7단계 모두 작성 완료'
            : `${7 - filled.length}개 단계가 비어 있습니다 (${draft.sections
                .filter((s) => s.status === 'empty')
                .map((s) => `${s.step}.${s.title}`)
                .join(', ')})`,
      },
    },
    {
      id: 'uncited',
      label: '출처 없이 사실을 주장한 문장이 없는가',
      detail: '감사에서 "이 수치 근거가 뭐죠?"에 답할 수 없는 문장은 제출할 수 없습니다 (제안서 5-2 ㉯).',
      auto: true,
      checked: uncited === 0,
      autoResult: {
        pass: uncited === 0,
        message: uncited === 0 ? '모든 사실 주장에 출처 표기 있음' : `출처 없는 문장 ${uncited}건`,
      },
    },
    {
      id: 'evidence',
      label: '자료 창고 근거를 실제로 인용했는가',
      detail: '자료 창고를 인용하지 않은 초안은 함평군 자료 기반으로 볼 수 없습니다.',
      auto: true,
      checked: citedCount > 0,
      autoResult: {
        pass: citedCount > 0,
        message: citedCount > 0 ? `자료 창고 문서 ${citedCount}건 인용` : '인용된 근거가 없습니다',
      },
    },
    {
      id: 'coverage',
      label: '공고문의 평가항목에 모두 대응했는가',
      detail: '가장 흔한 탈락 사유입니다. 배점표의 모든 항목에 대응 서술이 있어야 합니다.',
      auto: true,
      checked: uncovered.length === 0,
      autoResult: {
        pass: uncovered.length === 0,
        message: !announcement
          ? '연결된 공고문이 없어 자동 검사를 건너뜁니다 (사전 기획서는 이 항목이 면제됩니다)'
          : uncovered.length === 0
            ? `평가항목 ${announcement.evaluationItems.length}개 모두 대응 확인`
            : `대응이 확인되지 않는 항목 ${uncovered.length}개: ${uncovered.map((u) => u.name).join(', ')}`,
      },
    },
    {
      id: 'numbers',
      label: '모든 표의 합계를 재계산으로 검산했는가',
      detail: '총사업비·재원 분담·연차별 계획의 합계가 일치하는지 직접 확인하십시오.',
      auto: false,
      checked: false,
    },
    {
      id: 'format',
      label: '공고문이 지정한 서식과 분량 제한을 지켰는가',
      detail: '쪽수 제한, 지정 서식, 글꼴·여백 규정을 확인하십시오.',
      auto: false,
      checked: false,
    },
    {
      id: 'residue',
      label: '다른 사업명·다른 지자체명이 남아 있지 않은가',
      detail: '재사용한 문단에 이전 사업의 명칭이 남는 사고가 흔합니다.',
      auto: false,
      checked: false,
    },
    {
      id: 'privacy',
      label: '개인정보·대외비가 포함되지 않았는가',
      detail: '본 사업은 데이터 1·2등급만 취급합니다 (제안서 5-2).',
      auto: false,
      checked: false,
    },
    {
      id: 'documents',
      label: '제출 서류가 모두 준비되었는가',
      detail: '공고문의 제출 서류 목록과 대조하십시오.',
      auto: false,
      checked: false,
    },
  ]

  // 자동 항목은 판정 결과를 그대로 checked에 반영한다
  return items.map((it) => (it.auto ? { ...it, checked: it.autoResult?.pass ?? false } : it))
}

export function checklistPassed(items: ChecklistItem[]): boolean {
  return items.every((i) => i.checked)
}
