'use client'

import { useActionState, useState } from 'react'
import { saveSettings, type SettingsResult } from '@/app/actions/settings'
import { Card, Notice } from '@/components/ui'
import { AI_MODE_LABELS, type AiMode, type Settings } from '@/lib/types'

const INPUT =
  'w-full rounded border border-ink-300 px-2.5 py-1.5 text-[13px] outline-none focus:border-gov-500 focus:ring-2 focus:ring-gov-500/15'
const LABEL = 'mb-1 block text-[11px] font-semibold text-ink-600'

const MODE_DESC: Record<AiMode, string> = {
  demo: '키 없이 전 기능이 동작합니다. 외부로 자료를 전송하지 않습니다.',
  anthropic: '외부 상용 AI를 호출합니다. 자료 창고 검색 결과만 전송됩니다.',
  local: '군청 내부 서버의 모델을 호출합니다. 자료가 내부망을 벗어나지 않습니다.',
}

export function SettingsForm({ settings, hasKey }: { settings: Settings; hasKey: boolean }) {
  const [state, action, pending] = useActionState<SettingsResult | null, FormData>(saveSettings, null)
  const [mode, setMode] = useState<AiMode>(settings.aiMode)

  return (
    <form action={action}>
      <Card title="AI 모드" desc="본 사업의 적용 AI는 보안 요건 확인 후 착수 시 확정됩니다 (제안서 4-4).">
        <div className="space-y-2">
          {(['demo', 'anthropic', 'local'] as const).map((m) => (
            <label
              key={m}
              className={`flex cursor-pointer gap-3 rounded border px-3.5 py-3 transition ${
                mode === m ? 'border-gov-500 bg-gov-50' : 'border-ink-200 hover:bg-ink-50'
              }`}
            >
              <input
                type="radio"
                name="aiMode"
                value={m}
                checked={mode === m}
                onChange={() => setMode(m)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-gov-600"
              />
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-ink-800">{AI_MODE_LABELS[m]}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-ink-500">{MODE_DESC[m]}</p>
              </div>
            </label>
          ))}
        </div>

        {mode === 'anthropic' && (
          <div className="mt-4 space-y-2.5 rounded border border-ink-200 bg-ink-50 px-3.5 py-3">
            <div>
              <label className={LABEL}>
                API 키 {hasKey && <span className="font-normal text-ok-600">— 저장된 키 있음 (비워 두면 유지)</span>}
              </label>
              <input
                name="anthropicApiKey"
                type="password"
                autoComplete="off"
                placeholder={hasKey ? '••••••••••••  (변경할 때만 입력)' : 'sk-ant-...'}
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>모델</label>
              <select name="anthropicModel" defaultValue={settings.anthropicModel} className={INPUT}>
                <option value="claude-opus-5">claude-opus-5 — 가장 높은 품질</option>
                <option value="claude-sonnet-5">claude-sonnet-5 — 균형</option>
                <option value="claude-haiku-4-5-20251001">claude-haiku-4-5 — 가장 빠름</option>
              </select>
            </div>
          </div>
        )}

        {mode === 'local' && (
          <div className="mt-4 space-y-2.5 rounded border border-ink-200 bg-ink-50 px-3.5 py-3">
            <div>
              <label className={LABEL}>서버 주소 — OpenAI 호환 엔드포인트</label>
              <input name="localBaseUrl" defaultValue={settings.localBaseUrl} className={INPUT} />
              <p className="mt-0.5 text-[10px] text-ink-400">
                Ollama 기본값: http://localhost:11434/v1 · vLLM/LM Studio도 동일 규격입니다.
              </p>
            </div>
            <div>
              <label className={LABEL}>모델명</label>
              <input name="localModel" defaultValue={settings.localModel} className={INPUT} />
              <p className="mt-0.5 text-[10px] text-ink-400">
                제안서 4-4의 젬마4를 내부 서버에 설치한 경우 해당 모델명을 입력하십시오.
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 border-t border-ink-200 pt-4">
          <label className={LABEL}>담당자 이름 — 감사 이력에 기록됩니다</label>
          <input name="currentUser" defaultValue={settings.currentUser} className={INPUT} />
        </div>

        {state && (
          <div className="mt-3">
            <Notice tone={state.ok ? 'ok' : 'bad'}>{state.message}</Notice>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink-200 pt-4">
          <p className="text-[10.5px] text-ink-400">최종 수정 {settings.updatedAt.slice(0, 16).replace('T', ' ')}</p>
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-gov-600 px-5 py-2 text-xs font-semibold text-white hover:bg-gov-700 disabled:bg-ink-300"
          >
            {pending ? '저장 중…' : '설정 저장'}
          </button>
        </div>
      </Card>
    </form>
  )
}
