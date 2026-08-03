/**
 * 자료 창고 전용 검색엔진
 *
 * 제안서 5-2 ㉮ "AI가 함평군 자료 창고 안에서만 근거를 찾도록 제한"의 실행부.
 * 이 모듈이 반환한 문서만 AI 컨텍스트로 들어간다.
 *
 * 한국어 형태소 분석기는 무거운 네이티브 의존성이 필요하므로 배제하고,
 * 음절 bigram + 공백 토큰을 혼합한 BM25로 구현했다.
 * - bigram: '자연재해위험개선지구' 같은 복합명사를 부분 일치로 잡는다
 * - 토큰: '43.1%', '2027' 같은 숫자·영문을 정확 일치로 잡는다
 */
import type { EvidenceLevel, EvidenceMatch, StoredDocument } from './types'

const K1 = 1.5
const B = 0.75

/** 불용어 — 조사·접속어는 점수를 왜곡하므로 토큰 단계에서 제거한다. */
const STOPWORDS = new Set([
  '그리고', '또는', '하지만', '그러나', '따라서', '이에', '위한', '위해', '통해', '대한', '대해',
  '있는', '있다', '없는', '없다', '되는', '된다', '하는', '한다', '경우', '관련', '해당', '기준',
  '및', '등', '이', '그', '저', '것', '수', '더', '중', '내', '외',
])

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

/** 한글 음절 bigram + 영숫자 토큰을 함께 뽑는다. */
export function tokenize(text: string): string[] {
  const norm = normalize(text)
  const terms: string[] = []

  // 영문·숫자(소수점·퍼센트·쉼표 포함) 토큰
  for (const m of norm.matchAll(/[a-z0-9][a-z0-9.,%]*/g)) {
    const t = m[0].replace(/[.,]+$/, '')
    if (t.length > 0) terms.push(t)
  }

  // 한글 덩어리 → 어절 자체 + 음절 bigram
  for (const m of norm.matchAll(/[가-힣]+/g)) {
    const chunk = m[0]
    if (!STOPWORDS.has(chunk)) terms.push(chunk)
    for (let i = 0; i < chunk.length - 1; i++) {
      terms.push(chunk.slice(i, i + 2))
    }
  }

  return terms
}

interface IndexedDoc {
  doc: StoredDocument
  tf: Map<string, number>
  length: number
}

export class DocumentIndex {
  private docs: IndexedDoc[] = []
  private df = new Map<string, number>()
  private avgLength = 0

  constructor(documents: StoredDocument[]) {
    for (const doc of documents) {
      // 제목·태그는 본문보다 중요하므로 3회 반복해 가중치를 준다
      const searchable = [doc.title, doc.title, doc.title, doc.tags.join(' '), doc.tags.join(' '), doc.content].join(' ')
      const terms = tokenize(searchable)
      const tf = new Map<string, number>()
      for (const t of terms) tf.set(t, (tf.get(t) ?? 0) + 1)
      for (const t of tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1)
      this.docs.push({ doc, tf, length: terms.length })
    }
    this.avgLength = this.docs.length
      ? this.docs.reduce((s, d) => s + d.length, 0) / this.docs.length
      : 0
  }

  search(query: string, limit = 5): { doc: StoredDocument; score: number }[] {
    const qTerms = tokenize(query)
    if (qTerms.length === 0 || this.docs.length === 0) return []

    const N = this.docs.length
    const scored = this.docs.map(({ doc, tf, length }) => {
      let score = 0
      for (const t of qTerms) {
        const f = tf.get(t)
        if (!f) continue
        const n = this.df.get(t) ?? 0
        const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5))
        score += idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * length) / (this.avgLength || 1))))
      }
      return { doc, score }
    })

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }
}

/** 질의어가 가장 조밀하게 등장하는 구간을 발췌한다. */
export function makeSnippet(content: string, query: string, maxLen = 180): string {
  const flat = content.replace(/\s+/g, ' ').trim()
  if (flat.length <= maxLen) return flat

  const keys = tokenize(query).filter((t) => t.length >= 2)
  let bestPos = 0
  let bestHits = -1
  const step = 20
  for (let pos = 0; pos + maxLen <= flat.length + step; pos += step) {
    const window = flat.slice(pos, pos + maxLen).toLowerCase()
    let hits = 0
    for (const k of keys) if (window.includes(k)) hits++
    if (hits > bestHits) {
      bestHits = hits
      bestPos = pos
    }
  }
  const prefix = bestPos > 0 ? '… ' : ''
  const suffix = bestPos + maxLen < flat.length ? ' …' : ''
  return prefix + flat.slice(bestPos, bestPos + maxLen).trim() + suffix
}

/**
 * 평가항목 하나에 대한 함평군 대응 근거를 자료 창고에서 찾는다.
 * 제안서 2-2 "항목마다 함평군의 대응 근거가 자료 창고에서 자동으로 붙습니다"
 */
export function findEvidence(
  index: DocumentIndex,
  query: string,
  limit = 3,
): { matches: EvidenceMatch[]; level: EvidenceLevel } {
  const hits = index.search(query, limit)
  const matches: EvidenceMatch[] = hits.map((h) => ({
    docId: h.doc.id,
    title: h.doc.title,
    source: h.doc.source,
    score: Math.round(h.score * 100) / 100,
    snippet: makeSnippet(h.doc.content, query),
  }))

  const top = matches[0]?.score ?? 0
  // 임계값은 시드 데이터 기준으로 조정했다. 자료가 늘어나면 재조정이 필요하다.
  const level: EvidenceLevel = top >= 6 ? 'strong' : top >= 2.5 ? 'partial' : 'none'
  return { matches: level === 'none' ? matches.slice(0, 1) : matches, level }
}

export const EVIDENCE_LABEL: Record<EvidenceLevel, { text: string; tone: string; icon: string }> = {
  strong: { text: '근거 충분', tone: 'ok', icon: '●' },
  partial: { text: '보강 권장', tone: 'warn', icon: '●' },
  none: { text: '근거 없음', tone: 'bad', icon: '●' },
}
