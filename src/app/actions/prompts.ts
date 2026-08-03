'use server'

import { revalidatePath } from 'next/cache'
import { runPrompt } from '@/lib/ai'
import { logAudit, newId, read, update } from '@/lib/db'
import { PROMPT_CATEGORIES, type PromptCategory, type PromptTemplate } from '@/lib/types'

export interface RunResult {
  ok: boolean
  text: string
  usedDocs: { marker: string; id: string; title: string }[]
  note: string
}

/** 변수 치환 후 지시문을 실행한다. 자료 창고 근거가 함께 전달된다. */
export async function executePrompt(_prev: RunResult | null, form: FormData): Promise<RunResult> {
  const promptId = String(form.get('promptId') ?? '')
  const [prompts, documents, settings] = await Promise.all([read('prompts'), read('documents'), read('settings')])
  const tpl = prompts.find((p) => p.id === promptId)
  if (!tpl) return { ok: false, text: '지시문을 찾을 수 없습니다.', usedDocs: [], note: '' }

  let resolved = tpl.body
  const values: string[] = []
  for (const v of tpl.variables) {
    const value = String(form.get(`var_${v}`) ?? '').trim()
    if (value) values.push(value)
    resolved = resolved.split(`{{${v}}}`).join(value || `[${v} 미입력]`)
  }

  // 근거 검색은 담당자가 입력한 값을 기준으로 한다.
  // 지시문 본문으로 검색하면 "출력 형식", "반드시 지킬 것" 같은 지시 문구가 질의를 지배해
  // 엉뚱한 문서가 근거로 붙는다.
  const searchQuery = values.length
    ? `${values.join(' ')} ${values.join(' ')} ${tpl.title}`
    : `${tpl.title} ${tpl.purpose}`

  const result = await runPrompt({ resolvedPrompt: resolved, documents, settings, searchQuery })

  await update('prompts', (list) =>
    list.map((p) => (p.id === promptId ? { ...p, useCount: p.useCount + 1 } : p)),
  )
  await logAudit({
    actor: settings.currentUser,
    action: '지시문 실행',
    target: `${tpl.id} ${tpl.title}`,
    detail: `근거 ${result.usedDocs.length}건 전달 — ${result.note}`,
    aiMode: settings.aiMode,
  })

  revalidatePath('/prompts')
  return { ok: true, text: result.text, usedDocs: result.usedDocs, note: result.note }
}

export async function createCustomPrompt(form: FormData): Promise<void> {
  const title = String(form.get('title') ?? '').trim()
  const body = String(form.get('body') ?? '').trim()
  if (!title || !body) return

  const catRaw = String(form.get('category') ?? '')
  const category: PromptCategory = (PROMPT_CATEGORIES as string[]).includes(catRaw)
    ? (catRaw as PromptCategory)
    : '초안작성'

  const variables = [...new Set([...body.matchAll(/\{\{(.+?)\}\}/g)].map((m) => m[1].trim()))]
  const prompts = await read('prompts')
  const maxNo = prompts.reduce((m, p) => Math.max(m, p.no), 0)

  const tpl: PromptTemplate = {
    id: newId('P'),
    no: maxNo + 1,
    category,
    title,
    purpose: String(form.get('purpose') ?? '').trim() || '담당자 추가 지시문',
    body,
    variables,
    linkedStep: null,
    useCount: 0,
    custom: true,
  }

  await update('prompts', (list) => [...list, tpl])
  await logAudit({
    actor: (await read('settings')).currentUser,
    action: '지시문 추가',
    target: title,
    detail: `${category} / 변수 ${variables.length}개`,
  })
  revalidatePath('/prompts')
}

export async function deleteCustomPrompt(form: FormData): Promise<void> {
  const id = String(form.get('promptId') ?? '')
  // 기본 30종은 삭제할 수 없다. 검수 대상 결과물이기 때문이다.
  await update('prompts', (list) => list.filter((p) => !(p.id === id && p.custom)))
  revalidatePath('/prompts')
}
