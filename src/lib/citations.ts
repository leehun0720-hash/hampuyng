/**
 * 출처 표기 처리 — 제안서 5-2 ㉯ "생성된 문장마다 근거 문서 표기"
 *
 * AI에는 근거 문서를 [D1], [D2] … 순번으로 제시하고, 생성 문장 끝에 해당 마커를
 * 붙이도록 강제한다. 이 모듈은 그 마커를 실제 문서 ID로 되돌리고,
 * 근거 없이 생성된 문장을 찾아낸다.
 */
import type { StoredDocument } from './types'

export interface CitationContext {
  /** [D1] → 문서 */
  byMarker: Map<string, StoredDocument>
  /** AI 프롬프트에 넣을 근거 블록 */
  block: string
}

/** 검색된 문서를 [Dn] 번호를 붙인 컨텍스트 블록으로 만든다. */
export function buildCitationContext(docs: StoredDocument[]): CitationContext {
  const byMarker = new Map<string, StoredDocument>()
  const parts: string[] = []

  docs.forEach((doc, i) => {
    const marker = `D${i + 1}`
    byMarker.set(marker, doc)
    const flag =
      doc.verificationStatus === 'verified'
        ? '확인됨'
        : doc.verificationStatus === 'needs-check'
          ? '확인 필요'
          : '가정치'
    parts.push(
      `[${marker}] ${doc.title}\n` +
        `  원출처: ${doc.source}\n` +
        `  기준시점: ${doc.asOf ?? '미기재'} / 검증상태: ${flag}\n` +
        `  내용:\n${doc.content.split('\n').map((l) => `    ${l}`).join('\n')}`,
    )
  })

  return { byMarker, block: parts.join('\n\n') }
}

const MARKER_RE = /\[(D\d+)\]/g

/** 본문에서 실제로 인용된 문서 ID 목록을 뽑는다. */
export function extractCitedDocIds(text: string, ctx: CitationContext): string[] {
  const ids = new Set<string>()
  for (const m of text.matchAll(MARKER_RE)) {
    const doc = ctx.byMarker.get(m[1])
    if (doc) ids.add(doc.id)
  }
  return [...ids]
}

/**
 * 문장 단위 분해.
 *
 * 한국어 행정 문서에는 문장 경계가 아닌 마침표가 흔하다.
 *   · 날짜 표기 "2026. 5. 31." — 숫자 뒤 마침표에서 끊으면 한 문장이 셋으로 쪼개진다
 *   · "… 200억 원. (확인 필요) [D1]" — [D1]이 떨어져 나가면 앞 문장이 출처 없는 문장으로 오집계된다
 * 그래서 (1) 숫자 뒤 마침표에서는 끊지 않고, (2) 괄호·인용 마커로 시작하는 조각은 앞에 다시 붙인다.
 */
export function splitSentences(text: string): string[] {
  const out: string[] = []
  for (const line of text.split(/\n+/)) {
    for (const piece of line.split(/(?<=[^\d][.!?。])\s+/)) {
      const s = piece.trim()
      if (!s) continue
      // 앞 문장의 꼬리로 보이는 조각은 병합한다
      if (out.length > 0 && /^[([（【]|^\[D\d+\]/.test(s)) {
        out[out.length - 1] += ` ${s}`
        continue
      }
      out.push(s)
    }
  }
  return out
}

/**
 * 사실을 주장하면서 출처가 없는 문장을 찾는다.
 *
 * 표 행·제목·목차·지시문은 제외한다. 수치를 포함하거나 단정적으로 서술한
 * 문장만 근거 대상으로 본다.
 */
export function findUncitedSentences(text: string): string[] {
  const result: string[] = []
  for (const s of splitSentences(text)) {
    if (s.includes('[D')) continue
    if (s.includes('[확인 필요]') || s.includes('[근거없음]') || s.includes('[기준값 확인 필요]')) continue
    // 제목·불릿 라벨·표 구분선은 사실 주장이 아니다
    if (/^[#\-|=·○□▪▶【\[(]/.test(s)) continue
    // 줄 전체가 강조 표기인 경우는 소제목이다
    if (/^\*\*[^*]+\*\*$/.test(s)) continue
    if (s.length < 12) continue
    // 표 행: 파이프가 2개 이상
    if ((s.match(/\|/g)?.length ?? 0) >= 2) continue

    const hasNumber = /\d/.test(s)
    const isAssertive = /(이다|입니다|했다|하였다|된다|있다|없다|이며|으로서|에 달한다)[.。]?$/.test(s)
    if (hasNumber || isAssertive) result.push(s)
  }
  return result
}

/**
 * 초안 전체의 출처 없는 문장 수.
 *
 * 저장된 집계값 대신 본문에서 매번 다시 센다.
 * 제출 차단 판정의 근거이므로, 저장 시점과 판정 시점 사이에 값이 어긋나면 안 된다.
 */
export function countUncitedInDraft(sections: { content: string }[]): number {
  return sections.reduce((sum, s) => sum + (s.content ? findUncitedSentences(s.content).length : 0), 0)
}

/** 화면 렌더용 토큰 분해. [Dn] 마커를 배지로 바꿀 수 있게 한다. */
export type RenderToken =
  | { kind: 'text'; value: string }
  | { kind: 'cite'; marker: string; docId: string | null; title: string }

export function tokenizeForRender(
  text: string,
  markerToDoc: Record<string, { id: string; title: string }>,
): RenderToken[] {
  const tokens: RenderToken[] = []
  let last = 0
  for (const m of text.matchAll(MARKER_RE)) {
    const idx = m.index ?? 0
    if (idx > last) tokens.push({ kind: 'text', value: text.slice(last, idx) })
    const doc = markerToDoc[m[1]]
    tokens.push({
      kind: 'cite',
      marker: m[1],
      docId: doc?.id ?? null,
      title: doc?.title ?? '연결되지 않은 출처',
    })
    last = idx + m[0].length
  }
  if (last < text.length) tokens.push({ kind: 'text', value: text.slice(last) })
  return tokens
}
