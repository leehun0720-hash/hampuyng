/**
 * 초안 본문 렌더러
 *
 * 외부 마크다운 라이브러리를 쓰지 않고 필요한 문법(제목·표·목록·강조)만 처리한다.
 * 핵심 역할은 [Dn] 인용 마커를 실제 문서로 연결된 배지로 바꾸는 것이다 (제안서 5-2 ㉯).
 */
import Link from 'next/link'
import { Fragment, type ReactNode } from 'react'

export interface MarkerMap {
  [marker: string]: { id: string; title: string }
}

const MARKER_RE = /\[(D\d+)\]/g
const BOLD_RE = /\*\*(.+?)\*\*/g

function CiteBadge({ marker, doc }: { marker: string; doc?: { id: string; title: string } }) {
  if (!doc) {
    return (
      <span
        title="이 마커에 대응하는 근거 문서를 찾을 수 없습니다"
        className="mx-0.5 inline-block rounded border border-bad-500/30 bg-bad-50 px-1 align-baseline text-[10px] font-semibold text-bad-600"
      >
        {marker}?
      </span>
    )
  }
  return (
    <Link
      href={`/documents?q=${encodeURIComponent(doc.title)}`}
      title={`출처: ${doc.title}`}
      className="mx-0.5 inline-block rounded border border-gov-300 bg-gov-50 px-1 align-baseline text-[10px] font-semibold text-gov-700 no-underline hover:bg-gov-100"
    >
      {marker}
    </Link>
  )
}

/** 볼드와 [Dn] 마커를 처리한 인라인 노드를 만든다. */
function inline(text: string, markers: MarkerMap, keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  let cursor = 0
  let k = 0

  // 먼저 볼드 구간을 나눈 뒤, 각 조각에서 마커를 치환한다
  const pieces: { text: string; bold: boolean }[] = []
  BOLD_RE.lastIndex = 0
  for (const m of text.matchAll(BOLD_RE)) {
    const idx = m.index ?? 0
    if (idx > cursor) pieces.push({ text: text.slice(cursor, idx), bold: false })
    pieces.push({ text: m[1], bold: true })
    cursor = idx + m[0].length
  }
  if (cursor < text.length) pieces.push({ text: text.slice(cursor), bold: false })

  for (const piece of pieces) {
    const nodes: ReactNode[] = []
    let last = 0
    for (const m of piece.text.matchAll(MARKER_RE)) {
      const idx = m.index ?? 0
      if (idx > last) nodes.push(piece.text.slice(last, idx))
      nodes.push(<CiteBadge key={`${keyBase}-c${k++}`} marker={m[1]} doc={markers[m[1]]} />)
      last = idx + m[0].length
    }
    if (last < piece.text.length) nodes.push(piece.text.slice(last))

    out.push(
      piece.bold ? (
        <strong key={`${keyBase}-b${k++}`}>{nodes}</strong>
      ) : (
        <Fragment key={`${keyBase}-t${k++}`}>{nodes}</Fragment>
      ),
    )
  }
  return out
}

function splitRow(line: string): string[] {
  return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim())
}

const isTableRow = (l: string) => l.trim().startsWith('|') && l.includes('|', 1)
const isSeparator = (l: string) => /^\s*\|[\s:|-]+\|\s*$/.test(l)

export function Markdown({ content, markers = {} }: { content: string; markers?: MarkerMap }) {
  const lines = content.split(/\r?\n/)
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) {
      i++
      continue
    }

    // 표
    if (isTableRow(line)) {
      const rows: string[][] = []
      let hasHeader = false
      while (i < lines.length && isTableRow(lines[i])) {
        if (isSeparator(lines[i])) {
          hasHeader = rows.length === 1
          i++
          continue
        }
        rows.push(splitRow(lines[i]))
        i++
      }
      if (rows.length) {
        const [head, ...body] = rows
        blocks.push(
          <div key={key++} className="overflow-x-auto">
            <table>
              {hasHeader && (
                <thead>
                  <tr>
                    {head.map((c, j) => (
                      <th key={j}>{inline(c, markers, `h${key}-${j}`)}</th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {(hasHeader ? body : rows).map((r, ri) => (
                  <tr key={ri}>
                    {r.map((c, ci) => (
                      <td key={ci}>{inline(c, markers, `d${key}-${ri}-${ci}`)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        )
      }
      continue
    }

    // 제목
    const h = line.match(/^(#{2,4})\s+(.*)$/)
    if (h) {
      const level = h[1].length
      const body = inline(h[2], markers, `hd${key}`)
      blocks.push(level === 2 ? <h2 key={key++}>{body}</h2> : <h3 key={key++}>{body}</h3>)
      i++
      continue
    }

    // 목록
    if (/^\s*[-*·]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*·]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*·]\s+/, ''))
        i++
      }
      blocks.push(
        <ul key={key++}>
          {items.map((it, j) => (
            <li key={j}>{inline(it, markers, `li${key}-${j}`)}</li>
          ))}
        </ul>,
      )
      continue
    }

    // 문단 — 연속된 일반 줄을 묶는다
    const para: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !isTableRow(lines[i]) &&
      !/^#{2,4}\s/.test(lines[i]) &&
      !/^\s*[-*·]\s+/.test(lines[i])
    ) {
      para.push(lines[i])
      i++
    }
    blocks.push(<p key={key++}>{inline(para.join(' '), markers, `p${key}`)}</p>)
  }

  return <div className="prose-doc">{blocks}</div>
}
