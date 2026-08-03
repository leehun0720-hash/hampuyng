'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { extractEvaluationItems } from '@/lib/ai'
import { logAudit, newId, read, update } from '@/lib/db'
import { DocumentIndex, findEvidence } from '@/lib/search'
import type { Announcement, EvaluationItem, MetricRecord } from '@/lib/types'

/**
 * 공고문을 분석해 평가항목 표를 만들고, 항목마다 자료 창고에서 근거를 매칭한다.
 * 제안서 2-2 — "공고문 파일을 도구에 넣으면 3분 안에 평가항목이 표로 정리되고,
 * 항목마다 함평군의 대응 근거가 자료 창고에서 자동으로 붙습니다"
 *
 * 소요 시간을 실측하여 metrics에 기록한다. 게이트①의 절감률 근거가 된다.
 */
export async function analyzeAnnouncement(form: FormData): Promise<void> {
  const started = Date.now()

  const rawText = String(form.get('rawText') ?? '').trim()
  if (rawText.length < 30) return

  const [settings, documents] = await Promise.all([read('settings'), read('documents')])

  const { items: rawItems, note } = await extractEvaluationItems(rawText, settings)

  const index = new DocumentIndex(documents)
  const items: EvaluationItem[] = rawItems.map((it, i) => {
    const { matches, level } = findEvidence(index, `${it.name} ${it.focus}`, 3)
    return {
      id: `EV-${i + 1}`,
      name: it.name,
      points: it.points,
      focus: it.focus,
      required: it.required,
      evidence: matches,
      evidenceLevel: level,
    }
  })

  const elapsedSeconds = Math.max(1, Math.round((Date.now() - started) / 1000))

  const announcement: Announcement = {
    id: newId('AN'),
    title: String(form.get('title') ?? '').trim() || '제목 미기재 공고',
    ministry: String(form.get('ministry') ?? '').trim() || '[확인 필요]',
    program: String(form.get('program') ?? '').trim() || '[확인 필요]',
    deadline: String(form.get('deadline') ?? '').trim() || '[확인 필요]',
    budgetNote: String(form.get('budgetNote') ?? '').trim() || '[확인 필요]',
    rawText,
    evaluationItems: items,
    gapQueue: items.filter((i) => i.evidenceLevel === 'none').map((i) => i.name),
    analyzedAt: new Date().toISOString(),
    elapsedSeconds,
    aiMode: settings.aiMode,
    createdAt: new Date().toISOString(),
  }

  await update('announcements', (list) => [announcement, ...list])

  // 실측 기록 — 자동 계측이므로 measurement: 'auto'
  const metric: MetricRecord = {
    id: newId('M'),
    taskType: '공고 분석·평가항목 정리',
    mode: 'after',
    minutes: Math.max(1, Math.round(elapsedSeconds / 60)),
    staff: settings.currentUser,
    measurement: 'auto',
    note: `${announcement.title} — 평가항목 ${items.length}개 추출 (${note})`,
    recordedAt: new Date().toISOString(),
  }
  await update('metrics', (list) => [metric, ...list])

  await logAudit({
    actor: settings.currentUser,
    action: '공고문 분석',
    target: announcement.title,
    detail: `평가항목 ${items.length}개 추출, 근거 없음 ${announcement.gapQueue.length}개, 소요 ${elapsedSeconds}초`,
    aiMode: settings.aiMode,
  })

  revalidatePath('/announcements')
  revalidatePath('/')
  revalidatePath('/metrics')
  redirect(`/announcements/${announcement.id}`)
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await update('announcements', (list) => list.filter((a) => a.id !== id))
  revalidatePath('/announcements')
  redirect('/announcements')
}
