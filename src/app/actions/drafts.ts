'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { generateSection } from '@/lib/ai'
import { findUncitedSentences } from '@/lib/citations'
import { logAudit, newId, read, update } from '@/lib/db'
import { DRAFT_STEPS, type Draft, type DraftSection, type MetricRecord } from '@/lib/types'

function emptySections(): DraftSection[] {
  return DRAFT_STEPS.map((s) => ({
    step: s.step,
    title: s.title,
    content: '',
    citedDocIds: [],
    usedDocs: [],
    uncitedSentences: 0,
    status: 'empty',
    generatedAt: null,
    editedAt: null,
    aiMode: null,
  }))
}

export async function createDraftFromAnnouncement(form: FormData): Promise<void> {
  const announcementId = String(form.get('announcementId') ?? '')
  const [announcements, settings] = await Promise.all([read('announcements'), read('settings')])
  const a = announcements.find((x) => x.id === announcementId)
  if (!a) return

  const now = new Date().toISOString()
  const draft: Draft = {
    id: newId('DR'),
    title: a.program !== '[확인 필요]' ? a.program : a.title,
    announcementId: a.id,
    announcementTitle: a.title,
    sections: emptySections(),
    editLog: [],
    reviewPassed: false,
    submitted: false,
    submittedAt: null,
    elapsedSeconds: 0,
    createdAt: now,
    updatedAt: now,
  }

  await update('drafts', (list) => [draft, ...list])
  await logAudit({
    actor: settings.currentUser,
    action: '초안 생성 착수',
    target: draft.title,
    detail: `공고: ${a.title}`,
  })

  revalidatePath('/drafts')
  redirect(`/drafts/${draft.id}`)
}

/** 사전 기획서 — 공고 없이 시작한다 (제안서 4-3 방식 ②) */
export async function createBlankDraft(form: FormData): Promise<void> {
  const title = String(form.get('title') ?? '').trim()
  if (!title) return
  const settings = await read('settings')

  const now = new Date().toISOString()
  const draft: Draft = {
    id: newId('DR'),
    title,
    announcementId: null,
    announcementTitle: '공고 전 사전 기획서 (제안서 4-3 방식 ②)',
    sections: emptySections(),
    editLog: [],
    reviewPassed: false,
    submitted: false,
    submittedAt: null,
    elapsedSeconds: 0,
    createdAt: now,
    updatedAt: now,
  }

  await update('drafts', (list) => [draft, ...list])
  await logAudit({
    actor: settings.currentUser,
    action: '사전 기획서 착수',
    target: title,
    detail: '공고 전 사전 기획서로 생성',
  })

  revalidatePath('/drafts')
  redirect(`/drafts/${draft.id}`)
}

/**
 * 표준 절차 7단계 중 한 단계를 생성한다.
 * 자료 창고 검색 → 근거 블록 → AI 순서는 lib/ai에서 강제된다.
 */
export async function generateDraftSection(form: FormData): Promise<void> {
  const started = Date.now()
  const draftId = String(form.get('draftId') ?? '')
  const step = Number(form.get('step'))

  const [drafts, documents, settings, announcements] = await Promise.all([
    read('drafts'),
    read('documents'),
    read('settings'),
    read('announcements'),
  ])
  const draft = drafts.find((d) => d.id === draftId)
  const meta = DRAFT_STEPS.find((s) => s.step === step)
  if (!draft || !meta) return

  const announcement = announcements.find((a) => a.id === draft.announcementId)
  const summary = announcement
    ? `${announcement.ministry} ${announcement.program} / ${announcement.budgetNote} / 평가항목: ${announcement.evaluationItems
        .map((i) => i.name)
        .join(', ')}`
    : ''

  const result = await generateSection({
    step,
    stepTitle: meta.title,
    stepGuide: meta.guide,
    evidenceQuery: meta.evidenceQuery,
    projectName: draft.title,
    announcementSummary: summary,
    documents,
    settings,
  })

  const elapsed = Math.max(1, Math.round((Date.now() - started) / 1000))
  const now = new Date().toISOString()
  const wasGenerated = draft.sections.find((s) => s.step === step)?.status !== 'empty'

  await update('drafts', (list) =>
    list.map((d) =>
      d.id !== draftId
        ? d
        : {
            ...d,
            sections: d.sections.map((s) =>
              s.step !== step
                ? s
                : {
                    ...s,
                    content: result.text,
                    citedDocIds: result.citedDocIds,
                    usedDocs: result.usedDocs,
                    uncitedSentences: result.uncitedSentences,
                    status: 'generated' as const,
                    generatedAt: now,
                    aiMode: settings.aiMode,
                  },
            ),
            // 재생성 시에도 검토는 다시 받아야 한다
            reviewPassed: false,
            elapsedSeconds: d.elapsedSeconds + elapsed,
            updatedAt: now,
            editLog: [
              {
                at: now,
                actor: settings.currentUser,
                step,
                action: wasGenerated ? ('regenerate' as const) : ('generate' as const),
                note: `${result.note} / 인용 ${result.citedDocIds.length}건, 출처 없는 문장 ${result.uncitedSentences}건, 소요 ${elapsed}초`,
              },
              ...d.editLog,
            ],
          },
    ),
  )

  const metric: MetricRecord = {
    id: newId('M'),
    taskType: '초안 작성',
    mode: 'after',
    minutes: Math.max(1, Math.round(elapsed / 60)),
    staff: settings.currentUser,
    measurement: 'auto',
    note: `${draft.title} — ${step}단계 ${meta.title}`,
    recordedAt: now,
  }
  await update('metrics', (list) => [metric, ...list])

  await logAudit({
    actor: settings.currentUser,
    action: wasGenerated ? '초안 재생성' : '초안 생성',
    target: `${draft.title} / ${step}. ${meta.title}`,
    detail: `인용 ${result.citedDocIds.length}건, 출처 없는 문장 ${result.uncitedSentences}건, 소요 ${elapsed}초`,
    aiMode: settings.aiMode,
  })

  revalidatePath(`/drafts/${draftId}`)
  revalidatePath('/metrics')
  revalidatePath('/')
}

export async function saveDraftSection(form: FormData): Promise<void> {
  const draftId = String(form.get('draftId') ?? '')
  const step = Number(form.get('step'))
  const content = String(form.get('content') ?? '')

  const settings = await read('settings')
  const now = new Date().toISOString()
  const uncited = findUncitedSentences(content).length

  await update('drafts', (list) =>
    list.map((d) =>
      d.id !== draftId
        ? d
        : {
            ...d,
            sections: d.sections.map((s) =>
              s.step !== step
                ? s
                : {
                    ...s,
                    content,
                    uncitedSentences: uncited,
                    status: 'edited' as const,
                    editedAt: now,
                  },
            ),
            reviewPassed: false,
            updatedAt: now,
            editLog: [
              {
                at: now,
                actor: settings.currentUser,
                step,
                action: 'edit' as const,
                note: `담당자 직접 수정 — 출처 없는 문장 ${uncited}건`,
              },
              ...d.editLog,
            ],
          },
    ),
  )

  await logAudit({
    actor: settings.currentUser,
    action: '초안 수정',
    target: `초안 ${draftId} / ${step}단계`,
    detail: `담당자 직접 수정, 출처 없는 문장 ${uncited}건`,
  })

  revalidatePath(`/drafts/${draftId}`)
}

/** 담당자가 직접 실측한 소요 시간을 기록한다 (제안서 4-2 1단계 "소요시간 실측"). */
export async function recordManualTime(form: FormData): Promise<void> {
  const minutes = Number(form.get('minutes'))
  const taskType = String(form.get('taskType')) as MetricRecord['taskType']
  const mode = String(form.get('mode')) as 'before' | 'after'
  const note = String(form.get('note') ?? '').trim()
  if (!minutes || minutes <= 0) return

  const settings = await read('settings')
  const metric: MetricRecord = {
    id: newId('M'),
    taskType,
    mode,
    minutes,
    staff: settings.currentUser,
    measurement: 'manual',
    note,
    recordedAt: new Date().toISOString(),
  }
  await update('metrics', (list) => [metric, ...list])
  await logAudit({
    actor: settings.currentUser,
    action: '소요시간 실측 입력',
    target: taskType,
    detail: `${mode === 'before' ? '현행' : '개선'} ${minutes}분 — ${note}`,
  })

  revalidatePath('/metrics')
  revalidatePath('/')
}

export async function deleteDraft(form: FormData): Promise<void> {
  const id = String(form.get('draftId') ?? '')
  await update('drafts', (list) => list.filter((d) => d.id !== id))
  await update('reviews', (list) => list.filter((r) => r.draftId !== id))
  revalidatePath('/drafts')
  redirect('/drafts')
}
