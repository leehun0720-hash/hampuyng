'use server'

import { revalidatePath } from 'next/cache'
import { logAudit, read, update } from '@/lib/db'
import type { AiMode } from '@/lib/types'

export interface SettingsResult {
  ok: boolean
  message: string
}

export async function saveSettings(_prev: SettingsResult | null, form: FormData): Promise<SettingsResult> {
  const current = await read('settings')
  const aiMode = String(form.get('aiMode') ?? 'demo') as AiMode

  // 키 입력란이 비어 있으면 기존 키를 지우지 않는다 (화면에는 마스킹만 표시하기 때문)
  const keyInput = String(form.get('anthropicApiKey') ?? '')
  const anthropicApiKey = keyInput === '' ? current.anthropicApiKey : keyInput.trim()

  if (aiMode === 'anthropic' && !anthropicApiKey) {
    return { ok: false, message: 'Claude API 모드를 쓰려면 API 키가 필요합니다. 키를 입력하거나 다른 모드를 선택하십시오.' }
  }

  const next = {
    ...current,
    aiMode,
    anthropicApiKey,
    anthropicModel: String(form.get('anthropicModel') ?? current.anthropicModel).trim(),
    localBaseUrl: String(form.get('localBaseUrl') ?? current.localBaseUrl).trim(),
    localModel: String(form.get('localModel') ?? current.localModel).trim(),
    currentUser: String(form.get('currentUser') ?? current.currentUser).trim() || current.currentUser,
    updatedAt: new Date().toISOString(),
  }

  await update('settings', () => next)
  await logAudit({
    actor: next.currentUser,
    action: 'AI 모드 변경',
    target: aiMode,
    detail:
      aiMode === 'demo'
        ? '데모 모드 — 외부 전송 없음'
        : aiMode === 'anthropic'
          ? `Claude API / 모델 ${next.anthropicModel}`
          : `로컬 설치형 / ${next.localBaseUrl} / 모델 ${next.localModel}`,
    aiMode,
  })

  revalidatePath('/settings')
  revalidatePath('/')
  return { ok: true, message: '설정을 저장했습니다.' }
}

export async function saveRoiAssumptions(form: FormData): Promise<void> {
  const current = await read('settings')
  const num = (k: string, fallback: number) => {
    const v = Number(form.get(k))
    return Number.isFinite(v) && v >= 0 ? v : fallback
  }

  await update('settings', (s) => ({
    ...s,
    roi: {
      hoursPerCall: num('hoursPerCall', current.roi.hoursPerCall),
      reductionRate: num('reductionRate', current.roi.reductionRate),
      callsPerYear: num('callsPerYear', current.roi.callsPerYear),
      hourlyCost: num('hourlyCost', current.roi.hourlyCost),
      outsourcingCostPerCall: num('outsourcingCostPerCall', current.roi.outsourcingCostPerCall),
      projectCost: num('projectCost', current.roi.projectCost),
    },
    updatedAt: new Date().toISOString(),
  }))

  await logAudit({
    actor: current.currentUser,
    action: 'ROI 전제값 수정',
    target: '성과 측정',
    detail: `투입시간 ${form.get('hoursPerCall')}h / 절감률 ${form.get('reductionRate')}% / 연 ${form.get('callsPerYear')}건`,
  })

  revalidatePath('/metrics')
}
