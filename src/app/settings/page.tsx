import { SettingsForm } from './SettingsForm'
import { Card, Notice, PageHeader } from '@/components/ui'
import { read } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const settings = await read('settings')

  return (
    <>
      <PageHeader
        eyebrow="관리"
        title="설정"
        desc={
          <>
            제안서 4-4는 적용 AI를 &ldquo;젬마4 또는 외부 상용 AI — 보안 요건 확인 후 착수 시 확정&rdquo;으로 밝혔습니다.
            따라서 이 시스템은 특정 모델에 묶이지 않고 3가지 모드를 전환할 수 있게 만들었습니다.
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <SettingsForm settings={settings} hasKey={Boolean(settings.anthropicApiKey)} />

        <div className="space-y-4">
          <Card title="모드별 자료 전송 범위">
            <ul className="space-y-3 text-[11.5px] leading-relaxed">
              <li>
                <p className="font-semibold text-ink-800">데모 모드</p>
                <p className="text-ink-500">
                  외부로 아무것도 전송하지 않습니다. 규칙 기반으로 처리하며, 실제 AI 모드와 동일한 제약(자료 창고 한정,
                  출처 마커, [확인 필요] 표시)을 지킵니다. 화면 구조가 실제 운영과 달라지지 않습니다.
                </p>
              </li>
              <li>
                <p className="font-semibold text-ink-800">Claude API</p>
                <p className="text-ink-500">
                  자료 창고 검색 결과와 지시문만 외부로 전송됩니다. 창고 밖 자료, 등재되지 않은 파일은 전송되지 않습니다.
                  데이터 3·4등급은 애초에 등재가 차단되므로 전송 대상에 존재하지 않습니다.
                </p>
              </li>
              <li>
                <p className="font-semibold text-ink-800">로컬 설치형</p>
                <p className="text-ink-500">
                  군청 내부 서버에 설치된 모델을 호출합니다. 자료가 내부망을 벗어나지 않습니다. 제안서 4-4가 젬마4를
                  후보로 제시한 이유가 이것입니다 — 향후 대외비 자료 단계에서도 같은 방식을 유지할 수 있습니다.
                </p>
              </li>
            </ul>
          </Card>

          <Card title="자체 개발 모델에 관한 고지">
            <p className="text-[11.5px] leading-relaxed text-ink-600">
              텐에이아이의 한국어 특화 모델(TenOS-Ko)은 개선 중으로 본 사업에 적용하지 않습니다. 완성 시 자료 창고를 그대로
              이식할 수 있도록 호환성만 확보합니다. (제안서 4-4)
            </p>
          </Card>

          <Notice tone="warn">
            API 키는 이 서버의 <code className="font-mono">data/settings.json</code>에만 저장되며 화면에는 마스킹되어
            표시됩니다. 해당 파일은 형상관리에서 제외되어 있습니다.
          </Notice>
        </div>
      </div>
    </>
  )
}
