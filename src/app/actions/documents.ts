'use server'

import { revalidatePath } from 'next/cache'
import { logAudit, newId, read, update } from '@/lib/db'
import { DOC_CATEGORIES, isGradeAllowed, type DocCategory, type StoredDocument } from '@/lib/types'

export interface ActionResult {
  ok: boolean
  message: string
}

function parseCategory(v: FormDataEntryValue | null): DocCategory {
  const s = String(v ?? '')
  return (DOC_CATEGORIES as string[]).includes(s) ? (s as DocCategory) : '계획·정책'
}

export async function createDocument(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const title = String(form.get('title') ?? '').trim()
  const content = String(form.get('content') ?? '').trim()
  const source = String(form.get('source') ?? '').trim()
  const grade = Number(form.get('dataGrade'))

  if (!title || !content) return { ok: false, message: '제목과 본문은 반드시 입력해야 합니다.' }
  if (!source) return { ok: false, message: '원출처를 입력해야 합니다. 출처 없는 자료는 등재할 수 없습니다.' }

  // 데이터 등급 게이트 — 제안서 5-2. 서버에서 최종 차단한다.
  if (!isGradeAllowed(grade)) {
    await logAudit({
      actor: (await read('settings')).currentUser,
      action: '자료 등재 차단',
      target: title,
      detail: `데이터 ${grade}등급 자료의 등재를 차단했습니다. 본 사업은 1·2등급만 취급합니다.`,
    })
    return {
      ok: false,
      message:
        grade === 3
          ? '3등급(대외비) 자료는 본 사업에서 다루지 않습니다. 내부 설치형 체계 확보 후(3단계) 가능합니다.'
          : grade === 4
            ? '4등급(개인정보) 자료는 본 사업에서 다루지 않습니다. 개인정보 영향평가 완료 후(3단계) 가능합니다.'
            : '데이터 등급을 1등급 또는 2등급으로 선택하십시오.',
    }
  }

  const now = new Date().toISOString()
  const doc: StoredDocument = {
    id: newId('DOC'),
    title,
    category: parseCategory(form.get('category')),
    source,
    asOf: String(form.get('asOf') ?? '').trim() || undefined,
    dataGrade: grade,
    content,
    tags: String(form.get('tags') ?? '')
      .split(/[,\s]+/)
      .map((t) => t.trim())
      .filter(Boolean),
    verificationStatus:
      (String(form.get('verificationStatus') ?? 'needs-check') as StoredDocument['verificationStatus']) ??
      'needs-check',
    verificationNote: String(form.get('verificationNote') ?? '').trim() || undefined,
    createdAt: now,
    updatedAt: now,
  }

  await update('documents', (list) => [doc, ...list])
  await logAudit({
    actor: (await read('settings')).currentUser,
    action: '자료 등재',
    target: doc.title,
    detail: `${doc.category} / ${doc.dataGrade}등급 / 출처: ${doc.source}`,
  })

  revalidatePath('/documents')
  revalidatePath('/')
  return { ok: true, message: `"${doc.title}" 등재 완료.` }
}

export async function deleteDocument(id: string): Promise<void> {
  const list = await read('documents')
  const target = list.find((d) => d.id === id)
  await update('documents', (l) => l.filter((d) => d.id !== id))
  if (target) {
    await logAudit({
      actor: (await read('settings')).currentUser,
      action: '자료 삭제',
      target: target.title,
      detail: `문서 ID ${id}`,
    })
  }
  revalidatePath('/documents')
  revalidatePath('/')
}
