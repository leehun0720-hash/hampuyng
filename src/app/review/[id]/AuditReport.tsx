'use client'

import { useState } from 'react'
import { Card } from '@/components/ui'
import { countUncitedInDraft } from '@/lib/citations'
import type { Announcement, AuditEntry, Draft, ReviewRecord, StoredDocument } from '@/lib/types'

/**
 * 감사 대응 리포트 — 제안서 5-2
 * "이 수치 근거가 뭐죠?" / "AI가 만든 내용을 누가 검토했습니까?" / "왜 AI를 썼습니까?"
 * 세 질문에 즉시 답할 수 있는 형태로 묶어 내보낸다.
 */
export function AuditReport({
  draft,
  announcement,
  citedDocs,
  reviews,
  auditEntries,
}: {
  draft: Draft
  announcement: Announcement | undefined
  citedDocs: StoredDocument[]
  reviews: ReviewRecord[]
  auditEntries: AuditEntry[]
}) {
  const [copied, setCopied] = useState(false)

  const modes = [...new Set(draft.sections.map((s) => s.aiMode).filter(Boolean))]

  const report = [
    '감사 대응 근거 자료집',
    '='.repeat(50),
    '',
    `대상 문서: ${draft.title}`,
    `공모/구분: ${draft.announcementTitle}`,
    announcement ? `소관 부처: ${announcement.ministry} / 마감: ${announcement.deadline}` : '',
    `작성 기간: ${draft.createdAt.slice(0, 10)} ~ ${draft.updatedAt.slice(0, 10)}`,
    `제출 상태: ${draft.submitted ? `제출 확정 (${draft.submittedAt?.slice(0, 10)})` : '미제출'}`,
    '',
    '1. 수치별 근거 대조표',
    '-'.repeat(50),
    ...(citedDocs.length
      ? citedDocs.flatMap((d, i) => [
          `${i + 1}) ${d.title}`,
          `   원출처: ${d.source}`,
          `   기준 시점: ${d.asOf ?? '미기재'}`,
          `   데이터 등급: ${d.dataGrade}등급`,
          `   검증 상태: ${
            d.verificationStatus === 'verified'
              ? '확인됨'
              : d.verificationStatus === 'needs-check'
                ? '확인 필요'
                : '가정치'
          }${d.verificationNote ? ` — ${d.verificationNote}` : ''}`,
          '',
        ])
      : ['인용된 근거 없음', '']),
    '2. AI 활용 내역',
    '-'.repeat(50),
    `사용 모드: ${modes.length ? modes.join(', ') : '미사용'}`,
    '활용 범위: 국비 공모 제안서 초안 작성 (표준 절차 7단계)',
    '근거 한정 방식: 함평군 자료 창고 검색 결과만을 컨텍스트로 제공. 창고 밖 자료는 전달되지 않음.',
    '출처 표기: 생성 문장에 [Dn] 마커 부착, 근거 문서와 1:1 대응',
    `출처 없는 문장: ${countUncitedInDraft(draft.sections)}건`,
    '데이터 등급: 1·2등급만 취급. 3등급(대외비)·4등급(개인정보)은 시스템에서 등재 차단.',
    '',
    '3. 사람 검토 이력',
    '-'.repeat(50),
    ...(reviews.length
      ? reviews.flatMap((r) => [
          `${r.reviewedAt.slice(0, 16).replace('T', ' ')} / 검토자: ${r.reviewer} / 결과: ${r.passed ? '통과' : '미통과'}`,
          ...r.checklist.map((c) => `   [${c.checked ? 'O' : 'X'}] ${c.label}${c.autoResult ? ` — ${c.autoResult.message}` : ''}`),
          r.comment ? `   의견: ${r.comment}` : '',
          '',
        ])
      : ['검토 기록 없음', '']),
    '4. 작업 이력',
    '-'.repeat(50),
    ...draft.editLog.map(
      (l) =>
        `${l.at.slice(0, 16).replace('T', ' ')} / ${l.actor} / ${l.step ? `${l.step}단계 ` : ''}${
          l.action === 'generate'
            ? '생성'
            : l.action === 'regenerate'
              ? '재생성'
              : l.action === 'edit'
                ? '수정'
                : '검토 확정'
        } — ${l.note}`,
    ),
    '',
    '5. 시스템 활동 이력',
    '-'.repeat(50),
    ...(auditEntries.length
      ? auditEntries.map((e) => `${e.at.slice(0, 16).replace('T', ' ')} / ${e.actor} / ${e.action} / ${e.detail}`)
      : ['관련 기록 없음']),
    '',
    '6. 준거 규정',
    '-'.repeat(50),
    '· 행정안전부 「공공부문 AI 도입·활용 가이드」 (2026. 6. 배포)',
    '  — 기관 내부 자료를 우선 참조하여 답변을 생성하는 방식(검색 후 생성)의 우선 적용 권고',
    '· 「인공지능 발전과 신뢰 기반 조성 등에 관한 기본법」 (2026. 1. 22. 시행)',
    '  — AI 활용 시 신뢰성·투명성 확보 의무',
    '',
    `자료집 생성: ${draft.title} / 함평군 국비 공모 제안서 작성 지원 시스템`,
  ]
    .filter((l) => l !== '')
    .join('\n')

  async function copy() {
    try {
      await navigator.clipboard.writeText(report)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  function download() {
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `감사대응자료집_${draft.title.replace(/[\\/:*?"<>|]/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card
      title="감사 대응 리포트"
      desc="출처 · AI 활용 내역 · 사람 검토 이력 · 준거 규정을 한 파일로 묶습니다."
      action={
        <div className="flex gap-1.5">
          <button
            onClick={copy}
            className="rounded border border-ink-300 px-2.5 py-1 text-[11px] font-semibold text-ink-700 hover:bg-ink-50"
          >
            {copied ? '복사됨' : '복사'}
          </button>
          <button
            onClick={download}
            className="rounded bg-gov-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-gov-700"
          >
            내려받기
          </button>
        </div>
      }
    >
      <pre className="max-h-64 overflow-auto rounded border border-ink-200 bg-ink-50 px-3.5 py-3 font-mono text-[10.5px] leading-relaxed text-ink-600">
        {report}
      </pre>
    </Card>
  )
}
