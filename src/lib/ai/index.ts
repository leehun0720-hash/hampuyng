/**
 * AI 작업 오케스트레이션
 *
 * 모든 AI 호출은 반드시 이 모듈을 거친다.
 * 여기서 자료 창고 검색 → 근거 블록 구성 → 가드레일 부착 순서를 강제하므로,
 * 제안서 5-2 ㉮("자료 창고 안에서만 근거를 찾도록 제한")를 우회할 경로가 없다.
 */
import { buildCitationContext, extractCitedDocIds, findUncitedSentences } from '../citations'
import { DocumentIndex } from '../search'
import type { Settings, StoredDocument } from '../types'
import { AnthropicProvider } from './anthropic'
import { LocalProvider } from './local'
import { mockExtractEvaluationItems, mockGenerateSection, mockRunPrompt, type RawEvalItem } from './mock'
import { buildEvidencePrompt, GUARDRAIL, type Provider } from './provider'

export type { RawEvalItem } from './mock'

function getProvider(settings: Settings): Provider | null {
  switch (settings.aiMode) {
    case 'anthropic':
      return new AnthropicProvider(settings.anthropicModel, settings.anthropicApiKey)
    case 'local':
      return new LocalProvider(settings.localModel, settings.localBaseUrl)
    default:
      return null // demo
  }
}

/** 응답에서 JSON 배열/객체를 관대하게 뽑아낸다. 코드펜스와 앞뒤 설명을 허용한다. */
function parseLooseJson<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = (fenced ? fenced[1] : text).trim()
  const start = candidate.search(/[[{]/)
  if (start < 0) return null
  const open = candidate[start]
  const close = open === '[' ? ']' : '}'
  const end = candidate.lastIndexOf(close)
  if (end <= start) return null
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────
// 1) 공고문 → 평가항목 표
// ─────────────────────────────────────────────────────────────
export async function extractEvaluationItems(
  rawText: string,
  settings: Settings,
): Promise<{ items: RawEvalItem[]; note: string }> {
  const provider = getProvider(settings)
  if (!provider) return mockExtractEvaluationItems(rawText)

  const prompt = `아래는 중앙부처 공모 공고문 전문이다.

--- 공고문 시작 ---
${rawText.slice(0, 40000)}
--- 공고문 끝 ---

이 공고문의 심사·평가 항목을 빠짐없이 찾아 JSON 배열로만 출력하라.
각 원소는 다음 형태다.
{"name": "평가항목명", "points": 배점숫자 또는 null, "focus": "심사 착안점", "required": true/false}

규칙:
- 공고문에 없는 항목을 추측해서 만들지 마라.
- 배점이 명시되지 않은 항목은 points를 null로 하라.
- 배점이 큰 순서로 정렬하라.
- 설명 없이 JSON 배열만 출력하라.`

  try {
    const res = await provider.generate({ system: GUARDRAIL, prompt, maxTokens: 4096 })
    const parsed = parseLooseJson<RawEvalItem[]>(res.text)
    if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
      const fallback = mockExtractEvaluationItems(rawText)
      return { ...fallback, note: `${fallback.note} (AI 응답을 표로 해석하지 못해 규칙 기반 추출로 대체했습니다.)` }
    }
    const items = parsed
      .filter((x) => typeof x?.name === 'string' && x.name.trim().length > 1)
      .map((x) => ({
        name: String(x.name).trim(),
        points: typeof x.points === 'number' ? x.points : null,
        focus: typeof x.focus === 'string' ? x.focus : '',
        required: Boolean(x.required),
      }))
    const total = items.reduce((s, x) => s + (x.points ?? 0), 0)
    const note =
      total === 100
        ? `${provider.model}로 평가항목 ${items.length}개를 추출했습니다. 배점 합계 100점으로 일치합니다.`
        : `${provider.model}로 평가항목 ${items.length}개를 추출했습니다. 배점 합계는 ${total}점입니다. 원문 배점표와 대조하십시오.`
    return { items, note }
  } catch (e) {
    const fallback = mockExtractEvaluationItems(rawText)
    return { ...fallback, note: `${fallback.note} (AI 호출 실패로 규칙 기반 추출로 대체: ${(e as Error).message})` }
  }
}

// ─────────────────────────────────────────────────────────────
// 2) 표준 절차 7단계 초안 섹션 생성
// ─────────────────────────────────────────────────────────────
export interface SectionResult {
  text: string
  citedDocIds: string[]
  uncitedSentences: number
  usedDocs: { marker: string; id: string; title: string }[]
  note: string
}

export async function generateSection(params: {
  step: number
  stepTitle: string
  stepGuide: string
  evidenceQuery: string
  projectName: string
  announcementSummary: string
  documents: StoredDocument[]
  settings: Settings
}): Promise<SectionResult> {
  const { step, stepTitle, stepGuide, evidenceQuery, projectName, announcementSummary, documents, settings } = params

  // 자료 창고 검색 — 이 결과 밖의 자료는 어떤 경로로도 AI에 전달되지 않는다.
  // 단계 제목이 아니라 단계별 주제어로 검색한다 (DRAFT_STEPS.evidenceQuery 주석 참조).
  const index = new DocumentIndex(documents)
  const query = [evidenceQuery, evidenceQuery, projectName, announcementSummary.slice(0, 300)]
    .filter(Boolean)
    .join(' ')
  const hits = index.search(query, 6).map((h) => h.doc)

  const ctx = buildCitationContext(hits)
  const usedDocs = hits.map((d, i) => ({ marker: `D${i + 1}`, id: d.id, title: d.title }))

  const provider = getProvider(settings)
  let text: string
  let note: string

  if (!provider) {
    const mock = mockGenerateSection(step, projectName, hits)
    text = mock.text
    note = mock.note
  } else {
    const prompt = `함평군의 국비 공모 제안서 중 '${stepTitle}' 항목을 작성하라.

사업명: ${projectName}
공모 개요: ${announcementSummary || '[확인 필요]'}

작성 지침: ${stepGuide}

${buildEvidencePrompt(ctx.block)}

위 근거 안에 있는 내용만 사용하여 '${stepTitle}' 항목을 작성하라.
- 근거에서 가져온 문장 끝에 [D1] 형식으로 출처 마커를 붙여라.
- 근거로 채울 수 없는 항목은 [확인 필요]로 남겨라.
- 마크다운으로 작성하고, '## ${step}. ${stepTitle}' 제목으로 시작하라.
- 표가 필요한 항목은 마크다운 표로 작성하라.`

    try {
      const res = await provider.generate({ system: GUARDRAIL, prompt, maxTokens: 4096 })
      text = res.text
      note = `${res.model}로 생성했습니다. 자료 창고 문서 ${hits.length}건만 근거로 사용했습니다.`
    } catch (e) {
      const mock = mockGenerateSection(step, projectName, hits)
      text = mock.text
      note = `AI 호출 실패로 규칙 기반 초안으로 대체했습니다: ${(e as Error).message}`
    }
  }

  return {
    text,
    citedDocIds: extractCitedDocIds(text, ctx),
    uncitedSentences: findUncitedSentences(text).length,
    usedDocs,
    note,
  }
}

// ─────────────────────────────────────────────────────────────
// 3) 지시문 자유 실행
// ─────────────────────────────────────────────────────────────
export async function runPrompt(params: {
  resolvedPrompt: string
  documents: StoredDocument[]
  settings: Settings
  searchQuery?: string
}): Promise<{ text: string; usedDocs: { marker: string; id: string; title: string }[]; note: string }> {
  const { resolvedPrompt, documents, settings, searchQuery } = params

  const index = new DocumentIndex(documents)
  const hits = index.search(searchQuery || resolvedPrompt, 6).map((h) => h.doc)
  const ctx = buildCitationContext(hits)
  const usedDocs = hits.map((d, i) => ({ marker: `D${i + 1}`, id: d.id, title: d.title }))

  const provider = getProvider(settings)
  if (!provider) {
    return {
      text: mockRunPrompt(resolvedPrompt, hits),
      usedDocs,
      note: '데모 모드 — 외부 전송 없음',
    }
  }

  const prompt = `${buildEvidencePrompt(ctx.block)}

--- 작업 지시 ---
${resolvedPrompt}`

  try {
    const res = await provider.generate({ system: GUARDRAIL, prompt, maxTokens: 4096 })
    return {
      text: res.text,
      usedDocs,
      note: `${res.model}로 실행했습니다. 자료 창고 문서 ${hits.length}건만 함께 전송했습니다.`,
    }
  } catch (e) {
    return {
      text: `실행에 실패했습니다.\n\n원인: ${(e as Error).message}\n\n설정 화면에서 AI 모드와 접속 정보를 확인하십시오.`,
      usedDocs,
      note: 'AI 호출 실패',
    }
  }
}
