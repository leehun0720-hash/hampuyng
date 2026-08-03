/**
 * 5축 AX 진단 레이더차트 — 제안서 3-1
 * 외부 차트 라이브러리 없이 SVG로 직접 그린다.
 */
import type { DiagnosisAxis } from '@/lib/types'

const SIZE = 280
const CENTER = SIZE / 2
const RADIUS = 92
const MAX = 5

function point(index: number, total: number, value: number) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2
  const r = (value / MAX) * RADIUS
  return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)] as const
}

function polygon(axes: DiagnosisAxis[], pick: (a: DiagnosisAxis) => number) {
  return axes.map((a, i) => point(i, axes.length, pick(a)).join(',')).join(' ')
}

export function RadarChart({ axes }: { axes: DiagnosisAxis[] }) {
  const n = axes.length
  const avg = axes.reduce((s, a) => s + a.current, 0) / n
  const targetAvg = axes.reduce((s, a) => s + a.target, 0) / n

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-64 w-64 shrink-0">
        {/* 눈금 원 */}
        {[1, 2, 3, 4, 5].map((lvl) => (
          <polygon
            key={lvl}
            points={axes.map((_, i) => point(i, n, lvl).join(',')).join(' ')}
            fill="none"
            stroke="var(--color-ink-200)"
            strokeWidth={lvl === 5 ? 1.5 : 1}
          />
        ))}

        {/* 축선 */}
        {axes.map((_, i) => {
          const [x, y] = point(i, n, MAX)
          return <line key={i} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="var(--color-ink-200)" strokeWidth={1} />
        })}

        {/* 목표 */}
        <polygon
          points={polygon(axes, (a) => a.target)}
          fill="var(--color-gov-500)"
          fillOpacity={0.07}
          stroke="var(--color-gov-400)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />

        {/* 현재 */}
        <polygon
          points={polygon(axes, (a) => a.current)}
          fill="var(--color-warn-500)"
          fillOpacity={0.18}
          stroke="var(--color-warn-500)"
          strokeWidth={2}
        />
        {axes.map((a, i) => {
          const [x, y] = point(i, n, a.current)
          return <circle key={a.key} cx={x} cy={y} r={3} fill="var(--color-warn-500)" />
        })}

        {/* 축 이름 */}
        {axes.map((a, i) => {
          const [x, y] = point(i, n, MAX + 0.62)
          return (
            <text
              key={a.key}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={11}
              fontWeight={600}
              fill="var(--color-ink-600)"
            >
              {a.label}
            </text>
          )
        })}
      </svg>

      <div className="min-w-52 flex-1">
        <div className="mb-3 flex items-center gap-4">
          <div>
            <p className="text-[11px] text-ink-500">현재 평균</p>
            <p className="font-mono text-2xl font-bold text-warn-600">{avg.toFixed(1)}</p>
          </div>
          <span className="text-ink-300">→</span>
          <div>
            <p className="text-[11px] text-ink-500">12개월 목표</p>
            <p className="font-mono text-2xl font-bold text-gov-600">{targetAvg.toFixed(1)}</p>
          </div>
        </div>

        <ul className="space-y-1.5">
          {axes.map((a) => (
            <li key={a.key} className="flex items-start gap-2 text-[11px]">
              <span className="w-12 shrink-0 font-semibold text-ink-700">{a.label}</span>
              <span className="w-8 shrink-0 font-mono font-bold text-warn-600">{a.current.toFixed(1)}</span>
              <span className="min-w-0 flex-1 leading-relaxed text-ink-500">{a.basis}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[10.5px] leading-relaxed text-ink-400">
          척도: 1 부재 · 2 실험 · 3 부분도입 · 4 체계화 · 5 고도화
          <br />
          {axes.every((a) => a.status === 'pre-diagnosis')
            ? '공개 자료 기준 사전진단값입니다. 1단계 현황 파악(1~2주차)에서 현장 검증으로 확정합니다.'
            : '현장 검증이 완료된 값입니다.'}
        </p>
      </div>
    </div>
  )
}
