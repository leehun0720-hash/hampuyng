import Link from 'next/link'
import { Badge, Card, LinkButton, Notice, PageHeader, Progress } from '@/components/ui'
import { RadarChart } from '@/components/RadarChart'
import { read } from '@/lib/db'
import { evaluateGate1, formatMinutes, summarizeTime } from '@/lib/metrics'
import { AI_MODE_LABELS } from '@/lib/types'

export const dynamic = 'force-dynamic'

/** 제안서 4-2 보고·검수 시점 */
const MILESTONES = [
  { when: '1주차', label: '착수', deliverable: '착수계·수행계획서', criteria: '—' },
  { when: '2주차 말', label: '1차 보고', deliverable: '현황 진단 보고서', criteria: '소요시간 실측치 포함' },
  { when: '5주차 말', label: '2차 보고(중간)', deliverable: '중간보고서', criteria: '표준 절차 승인, 자료 200건 적재' },
  { when: '8주차 말', label: '3차 보고', deliverable: '실증 결과보고서', criteria: '재작성 비교표 + 사전 기획서' },
  { when: '10주차 말', label: '최종', deliverable: '최종보고서·매뉴얼', criteria: '결과물 5종 검수, 교육 2회 완료' },
]

export default async function Dashboard() {
  const [documents, metrics, training, diagnosis, drafts, announcements, prompts, audit, settings] =
    await Promise.all([
      read('documents'),
      read('metrics'),
      read('training'),
      read('diagnosis'),
      read('drafts'),
      read('announcements'),
      read('prompts'),
      read('audit'),
      read('settings'),
    ])

  const gate = evaluateGate1({ documents, metrics, training })
  const time = summarizeTime(metrics)

  // 검수 대상 결과물 5종 (제안서 4-1)
  const deliverables = [
    {
      label: '① 제안서 작성 표준 업무 매뉴얼',
      current: '표준 절차 7단계 · 지시문 연결 완료',
      done: true,
      href: '/prompts',
    },
    {
      label: '② 함평군 자료 창고 (200건 이상)',
      current: `${documents.length}건 적재`,
      done: documents.length >= 200,
      href: '/documents',
    },
    {
      label: '③ AI 활용 지시문 30종',
      current: `${prompts.filter((p) => !p.custom).length}종 (담당자 추가 ${prompts.filter((p) => p.custom).length}종)`,
      done: prompts.filter((p) => !p.custom).length >= 30,
      href: '/prompts',
    },
    {
      label: '④ 사전 기획서 1부',
      current:
        drafts.filter((d) => d.sections.every((s) => s.status !== 'empty')).length > 0
          ? `완성 ${drafts.filter((d) => d.sections.every((s) => s.status !== 'empty')).length}건`
          : `작성 중 ${drafts.length}건`,
      done: drafts.some((d) => d.sections.every((s) => s.status !== 'empty')),
      href: '/drafts',
    },
    {
      label: '⑤ 교육 이수 담당 공무원 2명 이상',
      current: `${training.filter((t) => t.basicDone && t.advancedDone && t.soloCapable).length}명 단독 수행 가능`,
      done: training.filter((t) => t.basicDone && t.advancedDone && t.soloCapable).length >= 2,
      href: '/metrics',
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow="함평군 행정 AI 전환(AX) 1단계"
        title="국비 공모 제안서 작성 지원 시스템"
        desc={
          <>
            국비 공모 제안서를 외주에서 사 오는 대신 군이 직접 만드는 체계입니다. 현재 AI 모드는{' '}
            <strong className="text-ink-700">{AI_MODE_LABELS[settings.aiMode]}</strong>이며, AI는 자료 창고 안에서만
            근거를 찾습니다.
          </>
        }
        action={<LinkButton href="/announcements">공고문 분석 시작 →</LinkButton>}
      />

      <div className="mb-5">
        <Notice tone={gate.passed ? 'ok' : 'warn'}>
          <strong>게이트 ① (3개월 · 실증 효과 검증)</strong> — {gate.verdict}
        </Notice>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {gate.conditions.map((c) => (
          <div
            key={c.key}
            className={`rounded-lg border bg-white px-4 py-3.5 ${
              c.passed ? 'border-ok-500/30' : 'border-ink-200'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11.5px] font-semibold leading-snug text-ink-700">{c.label}</p>
              <Badge tone={c.passed ? 'ok' : 'warn'}>{c.passed ? '충족' : '미충족'}</Badge>
            </div>
            <p className="mt-2 font-mono text-xl font-bold text-ink-900">
              {c.currentText}
              <span className="text-sm font-normal text-ink-400"> / {c.targetText}</span>
            </p>
            <div className="mt-2">
              <Progress value={c.progress} tone={c.passed ? 'ok' : 'warn'} />
            </div>
            <p className="mt-2 text-[10.5px] leading-relaxed text-ink-500">{c.detail}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card
          title="검수 대상 결과물 5종"
          desc="용역 완료 시 함평군에 남는 것 (제안서 4-1). 파일이 아니라 체계가 남습니다."
        >
          <ul className="space-y-2">
            {deliverables.map((d) => (
              <li key={d.label}>
                <Link
                  href={d.href}
                  className="flex items-center justify-between gap-3 rounded border border-ink-200 px-3 py-2 transition hover:border-gov-300 hover:bg-gov-50/40"
                >
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-ink-800">{d.label}</p>
                    <p className="mt-0.5 text-[11px] text-ink-500">{d.current}</p>
                  </div>
                  <Badge tone={d.done ? 'ok' : 'warn'}>{d.done ? '완료' : '진행 중'}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="AX 준비 수준 5축 진단"
          desc="제안서 3-1 — 기술을 살 의지는 있으나 안전하게 쓸 규칙과 자료가 아직 없는 상태입니다."
        >
          <RadarChart axes={diagnosis} />
        </Card>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card
          title="작성시간 실측 현황"
          desc="게이트① ㉮는 담당자 실투입 시간 기준입니다. AI 처리 시간은 자동 계측되지만 절감률에는 반영하지 않습니다."
          action={<LinkButton href="/metrics" variant="ghost">상세 →</LinkButton>}
        >
          {time.afterSamples === 0 ? (
            <div className="py-4">
              <p className="text-[12.5px] text-ink-600">
                담당자 실투입 시간의 개선 실측 기록이 아직 없습니다. 절감률을 산출할 수 없습니다.
              </p>
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-500">
                {time.aiSamples > 0 ? (
                  <>
                    AI 처리 시간은 {time.aiSamples}회 자동 계측되었습니다(합계{' '}
                    {formatMinutes(time.aiMinutes)}). 그러나 여기에는 담당자의 검토·보완 시간이 빠져 있어 절감률의
                    근거가 될 수 없습니다. 제안서 2-2도 개선 후 담당자 실투입을 18시간으로 잡았습니다.{' '}
                  </>
                ) : (
                  <>
                    제안서는 절감률 55%를 &ldquo;3단계 실증으로 검증한다&rdquo;고 밝혔습니다. 확인되지 않은 값을 여기에
                    표시하지 않습니다.{' '}
                  </>
                )}
                <Link href="/metrics" className="underline">
                  성과 측정
                </Link>
                에서 실투입 시간을 직접 입력하십시오.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-end gap-6">
                <div>
                  <p className="text-[11px] text-ink-500">현행 (기준값)</p>
                  <p className="font-mono text-xl font-bold text-ink-700">{formatMinutes(time.beforeMinutes)}</p>
                </div>
                <span className="pb-1.5 text-ink-300">→</span>
                <div>
                  <p className="text-[11px] text-ink-500">개선 (담당자 실측 {time.afterSamples}건)</p>
                  <p className="font-mono text-xl font-bold text-gov-600">{formatMinutes(time.afterMinutes)}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-[11px] text-ink-500">절감률</p>
                  <p
                    className={`font-mono text-2xl font-bold ${
                      (time.reductionRate ?? 0) >= 50 ? 'text-ok-600' : 'text-warn-600'
                    }`}
                  >
                    {time.reductionRate}%
                  </p>
                </div>
              </div>
              <Progress value={(time.reductionRate ?? 0) / 100} tone={(time.reductionRate ?? 0) >= 50 ? 'ok' : 'warn'} />
              <p className="text-[11px] leading-relaxed text-ink-500">
                현행 기준값은 제안서 2-2가 &ldquo;예시&rdquo;로 밝힌 값이며 1단계 현황 파악에서 실측 확정해야 합니다.
                개선값만으로 절감률을 확정할 수 없습니다.
              </p>
            </div>
          )}
        </Card>

        <Card title="현황" desc="시스템에 축적된 자산">
          <dl className="grid grid-cols-2 gap-3">
            {[
              { label: '자료 창고', v: `${documents.length}건`, href: '/documents' },
              { label: '분석한 공고', v: `${announcements.length}건`, href: '/announcements' },
              { label: '작성 중 초안', v: `${drafts.length}건`, href: '/drafts' },
              { label: '지시문', v: `${prompts.length}종`, href: '/prompts' },
            ].map((s) => (
              <Link
                key={s.label}
                href={s.href}
                className="rounded border border-ink-200 px-3 py-2.5 transition hover:border-gov-300 hover:bg-gov-50/40"
              >
                <dt className="text-[11px] text-ink-500">{s.label}</dt>
                <dd className="mt-0.5 font-mono text-lg font-bold text-ink-900">{s.v}</dd>
              </Link>
            ))}
          </dl>
          <div className="mt-3 border-t border-ink-200 pt-3">
            <p className="mb-1.5 text-[11px] font-semibold text-ink-600">최근 활동</p>
            <ul className="space-y-1">
              {audit.slice(0, 5).map((e) => (
                <li key={e.id} className="flex gap-2 text-[11px]">
                  <span className="shrink-0 font-mono text-ink-400">{e.at.slice(5, 10)}</span>
                  <span className="font-medium text-ink-700">{e.action}</span>
                  <span className="min-w-0 truncate text-ink-400">{e.target}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <Card title="10주 수행 일정과 검수 시점" desc="제안서 4-2 — 보고·검수 시점">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-ink-200 text-left text-[11px] text-ink-500">
                <th className="py-2 pr-3 font-semibold">시기</th>
                <th className="py-2 pr-3 font-semibold">구분</th>
                <th className="py-2 pr-3 font-semibold">제출물</th>
                <th className="py-2 font-semibold">검수 기준</th>
              </tr>
            </thead>
            <tbody>
              {MILESTONES.map((m) => (
                <tr key={m.when} className="border-b border-ink-100 last:border-0">
                  <td className="py-2.5 pr-3 font-mono text-ink-600">{m.when}</td>
                  <td className="py-2.5 pr-3 font-semibold text-ink-800">{m.label}</td>
                  <td className="py-2.5 pr-3 text-ink-600">{m.deliverable}</td>
                  <td className="py-2.5 text-ink-500">{m.criteria}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-5">
        <Notice>
          <strong>신뢰성·감사 대응 3중 장치가 이 시스템에 적용되어 있습니다 (제안서 5-2).</strong>
          <br />㉮ AI는 자료 창고 안에서만 근거를 찾습니다 — 창고 밖 자료는 어떤 경로로도 전달되지 않습니다.
          <br />㉯ 생성된 문장마다 근거 문서가 [Dn] 마커로 표기됩니다 — 클릭하면 원문을 확인할 수 있습니다.
          <br />㉰ 검토 확인목록을 통과하지 않으면 제출 확정 버튼이 잠깁니다 — 검토 이력은 자동 기록됩니다.
        </Notice>
      </div>
    </>
  )
}
