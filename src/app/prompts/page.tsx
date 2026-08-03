import Link from 'next/link'
import { CustomPromptForm } from './CustomPromptForm'
import { PromptCard } from './PromptCard'
import { Card, PageHeader } from '@/components/ui'
import { read } from '@/lib/db'
import { PROMPT_CATEGORIES } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function PromptsPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat = '' } = await searchParams
  const all = await read('prompts')
  const base = all.filter((p) => !p.custom)
  const list = cat ? all.filter((p) => p.category === cat) : all

  return (
    <>
      <PageHeader
        eyebrow="기반 · 검수 대상 결과물 ③"
        title="AI 활용 지시문 30종"
        help="prompts"
        desc={
          <>
            복사해 붙이면 되는 작업 지시 문장입니다. 모든 지시문은 자료 창고 한정 원칙을 전제로 작성되었으며, 실행 시
            자료 창고 근거가 함께 전달됩니다. 기본 30종은 검수 대상 결과물이므로 삭제할 수 없습니다.
          </>
        }
        action={<CustomPromptForm />}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-[11px] text-ink-500">기본 지시문</p>
          <p className="mt-1 font-mono text-xl font-bold text-ink-900">
            {base.length}
            <span className="text-sm font-normal text-ink-400"> / 30종</span>
          </p>
        </Card>
        <Card>
          <p className="text-[11px] text-ink-500">담당자 추가</p>
          <p className="mt-1 font-mono text-xl font-bold text-ink-900">{all.length - base.length}종</p>
        </Card>
        <Card className="sm:col-span-2">
          <p className="text-[11px] text-ink-500">누적 사용</p>
          <p className="mt-1 font-mono text-xl font-bold text-ink-900">
            {all.reduce((s, p) => s + p.useCount, 0)}회
          </p>
          <p className="mt-1 text-[10px] text-ink-400">
            사용 이력은 감사 이력에도 기록됩니다 — 어떤 지시문으로 무엇을 만들었는지 추적 가능합니다.
          </p>
        </Card>
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        <Link
          href="/prompts"
          className={`rounded border px-2.5 py-1 text-[11px] font-medium ${
            !cat ? 'border-gov-600 bg-gov-600 text-white' : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
          }`}
        >
          전체 {all.length}
        </Link>
        {PROMPT_CATEGORIES.map((c) => {
          const n = all.filter((p) => p.category === c).length
          return (
            <Link
              key={c}
              href={`/prompts?cat=${encodeURIComponent(c)}`}
              className={`rounded border px-2.5 py-1 text-[11px] font-medium ${
                cat === c
                  ? 'border-gov-600 bg-gov-600 text-white'
                  : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
              }`}
            >
              {c} {n}
            </Link>
          )
        })}
      </div>

      <div className="space-y-2.5">
        {list
          .slice()
          .sort((a, b) => a.no - b.no)
          .map((p) => (
            <PromptCard key={p.id} prompt={p} />
          ))}
      </div>
    </>
  )
}
