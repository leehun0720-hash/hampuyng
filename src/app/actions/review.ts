'use server'

import { revalidatePath } from 'next/cache'
import { buildChecklist, checklistPassed } from '@/lib/checklist'
import { logAudit, newId, read, update } from '@/lib/db'
import type { ReviewRecord } from '@/lib/types'

export interface ReviewActionResult {
  ok: boolean
  message: string
}

/**
 * 검토 기록을 남긴다.
 * 자동 판정 항목은 폼 입력을 신뢰하지 않고 서버에서 다시 계산한다.
 * 사람이 체크박스를 임의로 켜서 통과시킬 수 없게 하기 위함이다.
 */
export async function submitReview(
  _prev: ReviewActionResult | null,
  form: FormData,
): Promise<ReviewActionResult> {
  const draftId = String(form.get('draftId') ?? '')
  const reviewer = String(form.get('reviewer') ?? '').trim()
  const comment = String(form.get('comment') ?? '').trim()

  if (!reviewer) return { ok: false, message: '검토자 이름을 입력하십시오. 검토 이력에 기록됩니다.' }

  const [drafts, announcements, settings] = await Promise.all([
    read('drafts'),
    read('announcements'),
    read('settings'),
  ])
  const draft = drafts.find((d) => d.id === draftId)
  if (!draft) return { ok: false, message: '초안을 찾을 수 없습니다.' }

  const announcement = announcements.find((a) => a.id === draft.announcementId)
  const checklist = buildChecklist(draft, announcement).map((item) =>
    item.auto ? item : { ...item, checked: form.get(`chk_${item.id}`) === 'on' },
  )

  const passed = checklistPassed(checklist)
  const now = new Date().toISOString()

  const record: ReviewRecord = {
    id: newId('RV'),
    draftId,
    reviewer,
    reviewedAt: now,
    checklist,
    passed,
    comment,
  }

  await update('reviews', (list) => [record, ...list])
  await update('drafts', (list) =>
    list.map((d) =>
      d.id !== draftId
        ? d
        : {
            ...d,
            reviewPassed: passed,
            updatedAt: now,
            editLog: [
              {
                at: now,
                actor: reviewer,
                step: 0,
                action: 'confirm' as const,
                note: passed
                  ? '검토 확인목록 전 항목 통과'
                  : `검토 미통과 — 미충족 ${checklist.filter((c) => !c.checked).length}건`,
              },
              ...d.editLog,
            ],
          },
    ),
  )

  await logAudit({
    actor: reviewer,
    action: passed ? '검토 통과' : '검토 미통과',
    target: draft.title,
    detail: passed
      ? `확인목록 ${checklist.length}개 항목 전부 충족${comment ? ` — ${comment}` : ''}`
      : `미충족: ${checklist.filter((c) => !c.checked).map((c) => c.label).join(' / ')}`,
    aiMode: settings.aiMode,
  })

  revalidatePath(`/review/${draftId}`)
  revalidatePath(`/drafts/${draftId}`)
  revalidatePath('/review')

  return {
    ok: passed,
    message: passed
      ? '검토 확인목록을 모두 통과했습니다. 제출을 확정할 수 있습니다.'
      : `미충족 항목이 ${checklist.filter((c) => !c.checked).length}건 남아 있습니다. 제출할 수 없습니다.`,
  }
}

/**
 * 제출 확정.
 * 서버에서 확인목록을 다시 계산하므로, 검토를 우회한 제출은 불가능하다 (제안서 5-2 ㉰).
 */
export async function confirmSubmission(
  _prev: ReviewActionResult | null,
  form: FormData,
): Promise<ReviewActionResult> {
  const draftId = String(form.get('draftId') ?? '')
  const [drafts, announcements, reviews, settings] = await Promise.all([
    read('drafts'),
    read('announcements'),
    read('reviews'),
    read('settings'),
  ])
  const draft = drafts.find((d) => d.id === draftId)
  if (!draft) return { ok: false, message: '초안을 찾을 수 없습니다.' }

  const announcement = announcements.find((a) => a.id === draft.announcementId)
  const autoChecks = buildChecklist(draft, announcement).filter((c) => c.auto)
  const latestReview = reviews.find((r) => r.draftId === draftId)

  if (!autoChecks.every((c) => c.checked)) {
    return {
      ok: false,
      message: `자동 검사 미통과: ${autoChecks.filter((c) => !c.checked).map((c) => c.label).join(' / ')}`,
    }
  }
  if (!latestReview?.passed) {
    return { ok: false, message: '사람 검토가 완료되지 않았습니다. 검토 확인목록을 먼저 통과시키십시오.' }
  }

  const now = new Date().toISOString()
  await update('drafts', (list) =>
    list.map((d) => (d.id !== draftId ? d : { ...d, submitted: true, submittedAt: now, updatedAt: now })),
  )
  await logAudit({
    actor: settings.currentUser,
    action: '제출 확정',
    target: draft.title,
    detail: `검토자 ${latestReview.reviewer} / 검토 일시 ${latestReview.reviewedAt}`,
    aiMode: settings.aiMode,
  })

  revalidatePath(`/review/${draftId}`)
  revalidatePath(`/drafts/${draftId}`)
  revalidatePath('/')
  return { ok: true, message: '제출이 확정되었습니다. 감사 대응 리포트를 내려받아 보관하십시오.' }
}

/** 교육 이수 기록 — 게이트① 조건 ㉰ */
export async function recordTraining(form: FormData): Promise<void> {
  const name = String(form.get('name') ?? '').trim()
  if (!name) return

  const record = {
    id: newId('TR'),
    name,
    department: String(form.get('department') ?? '').trim() || '[확인 필요]',
    basicDone: form.get('basicDone') === 'on',
    advancedDone: form.get('advancedDone') === 'on',
    soloCapable: form.get('soloCapable') === 'on',
    note: String(form.get('note') ?? '').trim(),
  }

  await update('training', (list) => [...list, record])
  await logAudit({
    actor: (await read('settings')).currentUser,
    action: '교육 이수 기록',
    target: name,
    detail: `기본 ${record.basicDone ? '이수' : '미이수'} / 심화 ${record.advancedDone ? '이수' : '미이수'} / 단독수행 ${record.soloCapable ? '가능' : '불가'}`,
  })

  revalidatePath('/metrics')
  revalidatePath('/')
}
