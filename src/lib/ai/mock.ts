/**
 * 데모 모드 — 규칙 기반 처리기
 *
 * API 키 없이 전 기능을 시연하기 위한 모드이며, 외부로 자료를 전송하지 않는다.
 * 중요한 설계 원칙: 데모 모드도 실제 AI 모드와 **동일한 제약**을 지킨다.
 *   · 자료 창고 검색 결과 밖의 사실을 만들어내지 않는다
 *   · 생성 문장에 [Dn] 출처 마커를 붙인다
 *   · 채울 수 없는 항목은 [확인 필요]로 남긴다
 * 따라서 데모 모드에서 본 화면과 실제 운영 화면의 구조가 달라지지 않는다.
 */
import type { StoredDocument } from '../types'

export interface RawEvalItem {
  name: string
  points: number | null
  focus: string
  required: boolean
}

const NOISE = /(합계|총점|소계|배점\s*합|계$|점수$|구\s*분$|평가\s*항목$|심사\s*항목$|세부\s*내용$)/

function cleanName(s: string): string {
  return s
    .replace(/^[\s○□▪▶◦·•\-–—*#\d]+[.)]?\s*/, '')
    .replace(/[(（]\s*\d{1,3}\s*점?\s*[)）]?\s*$/, '')
    .replace(/\s*\d{1,3}\s*점\s*$/, '')
    .replace(/[|]/g, '')
    .trim()
}

function pushItem(out: RawEvalItem[], item: RawEvalItem) {
  if (item.name.length < 2 || item.name.length > 40) return
  if (NOISE.test(item.name)) return
  if (/^\d+$/.test(item.name)) return
  if (out.some((x) => x.name === item.name)) return
  out.push(item)
}

/**
 * 공고문에서 평가항목 표를 추출한다.
 *
 * 공고문 서식이 부처마다 다르므로 세 가지 패턴을 차례로 시도한다.
 * 하나도 인식하지 못하면 표준 심사 프레임을 제시하되, 그것이 공고문에서
 * 추출한 값이 아님을 note로 분명히 밝힌다.
 */
export function mockExtractEvaluationItems(raw: string): { items: RawEvalItem[]; note: string } {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const out: RawEvalItem[] = []

  // 패턴 1 — 마크다운/텍스트 표 행
  for (const line of lines) {
    if ((line.match(/\|/g)?.length ?? 0) < 2) continue
    const cells = line.split('|').map((c) => c.trim()).filter(Boolean)
    if (cells.length < 2) continue
    if (cells.every((c) => /^[-:\s]+$/.test(c))) continue

    const pointCellIdx = cells.findIndex((c) => /^\d{1,3}\s*점?$/.test(c))
    const points = pointCellIdx >= 0 ? Number(cells[pointCellIdx].replace(/[^\d]/g, '')) : null
    const nameCell = cells.find((c, i) => i !== pointCellIdx && !/^\d{1,3}\s*점?$/.test(c))
    if (!nameCell) continue
    const focus =
      cells
        .filter((c, i) => i !== pointCellIdx && c !== nameCell)
        .sort((a, b) => b.length - a.length)[0] ?? ''

    pushItem(out, {
      name: cleanName(nameCell),
      points,
      focus,
      required: /필수/.test(line),
    })
  }

  // 패턴 2 — "항목명 (20점)" / "항목명 20점"
  if (out.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const m = line.match(/^(.{2,40}?)\s*[(（]?\s*(\d{1,3})\s*점\s*[)）]?\s*(.*)$/)
      if (!m) continue
      const rest = m[3].trim()
      const next = lines[i + 1] ?? ''
      pushItem(out, {
        name: cleanName(m[1]),
        points: Number(m[2]),
        focus: rest || (/^[-·○▪]/.test(next) ? next.replace(/^[-·○▪]\s*/, '') : ''),
        required: /필수/.test(line),
      })
    }
  }

  // 패턴 3 — 공백 정렬 표 "항목명      20"
  if (out.length === 0) {
    for (const line of lines) {
      const m = line.match(/^(.{2,40}?)\s{2,}(\d{1,3})\s*$/)
      if (!m) continue
      pushItem(out, { name: cleanName(m[1]), points: Number(m[2]), focus: '', required: false })
    }
  }

  if (out.length > 0) {
    out.sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
    const total = out.reduce((s, x) => s + (x.points ?? 0), 0)
    const note =
      total === 100
        ? `공고문에서 평가항목 ${out.length}개를 추출했습니다. 배점 합계 100점으로 일치합니다.`
        : `공고문에서 평가항목 ${out.length}개를 추출했습니다. 배점 합계는 ${total}점으로, 100점과 일치하지 않습니다. 원문 배점표를 확인하십시오.`
    return { items: out, note }
  }

  // 인식 실패 — 지어내지 않고 표준 프레임임을 명시한다
  return {
    items: [
      { name: '사업의 필요성 및 타당성', points: null, focus: '지역 여건·상위 정책 부합성', required: false },
      { name: '사업계획의 구체성', points: null, focus: '세부 과제·추진 방법·일정의 구체성', required: false },
      { name: '추진 역량 및 의지', points: null, focus: '수행 조직·유사 사업 실적', required: false },
      { name: '예산의 적정성', points: null, focus: '산출 근거·재원 분담의 타당성', required: false },
      { name: '기대효과 및 성과관리', points: null, focus: '정량 효과 산식·성과지표 측정 가능성', required: false },
    ],
    note:
      '공고문에서 배점표를 인식하지 못했습니다. 아래는 국고보조사업 심사에서 통상 사용되는 표준 프레임이며, ' +
      '공고문에서 추출한 값이 아닙니다. 실제 평가항목과 배점은 공고문 원문을 확인해 직접 수정하십시오.',
  }
}

/**
 * 줄바꿈으로 접힌 문장을 되살린다.
 * 들여쓰기된 줄, 그리고 앞 줄이 문장부호 없이 끝난 경우의 다음 줄을 이어붙인다.
 * 그러지 않으면 "…공모에 선정되어" 처럼 문장이 잘린 채 인용된다.
 */
function unwrap(content: string): string[] {
  const out: string[] = []
  for (const raw of content.split(/\r?\n/)) {
    if (!raw.trim()) {
      out.push('')
      continue
    }
    const line = raw.trim()
    const prev = out.length ? out[out.length - 1] : ''
    const indented = /^\s{2,}/.test(raw)
    const startsNewBlock = /^[-·•○□▪*#|]|^\d+[.)]\s|^[가-힣A-Za-z\s]{2,14}[:：]$/.test(line)
    const prevIncomplete = prev !== '' && !/[.。:：)\]]$/.test(prev)

    if (prev !== '' && (indented || (prevIncomplete && !startsNewBlock))) {
      out[out.length - 1] += ` ${line}`
    } else {
      out.push(line)
    }
  }
  return out.filter(Boolean).map((l) => l.replace(/^[-·•○□▪*]\s*/, '').trim())
}

/** 숫자 뒤에 단위가 붙어야 '사실'로 본다. 목차 번호("2. 추진 배경")를 걸러내기 위함이다. */
const UNIT_FACT = /\d[\d,.]*\s*(원|명|%|건|억|만|천|개소|개|년|개월|월|주|일|시간|분|배|점|등급|단계|쪽|㎡)/

/**
 * 문서 본문에서 인용할 만한 핵심 문장을 뽑는다.
 *
 * 목차·항목 제목·꼬리표 같은 구조 요소는 사실 주장이 아니므로 제외한다.
 * 규칙 기반이라 판단력은 없지만, 최소한 "무엇이 사실 문장이 아닌가"는 걸러낸다.
 */
function keyFacts(doc: StoredDocument, limit: number): string[] {
  const lines = unwrap(doc.content).filter((l) => l.length >= 14 && l.length <= 180)

  const usable = lines.filter(
    (l) =>
      !/^\d+[.)]\s/.test(l) && // "2. 추진 배경 및 필요성" 같은 목차
      !/[:：]$/.test(l) && // "공모 제안서에서의 활용:" 같은 꼬리표
      !/^[가-힣A-Za-z\s]{2,14}$/.test(l) && // 단독 제목
      !/^(주의|참고|※)/.test(l),
  )

  const withUnit = usable.filter((l) => UNIT_FACT.test(l))
  const complete = usable.filter((l) => /(다|음|함)[.。]$/.test(l))

  const picked: string[] = []
  for (const l of [...withUnit, ...complete]) {
    if (picked.length >= limit) break
    if (!picked.includes(l)) picked.push(l)
  }
  return picked
}

function verificationCaveat(doc: StoredDocument): string {
  if (doc.verificationStatus === 'needs-check') return ' (착수 시 확인이 필요한 값)'
  if (doc.verificationStatus === 'assumption') return ' (가정치)'
  return ''
}

const STEP_INTRO: Record<number, string> = {
  1: '사업 개요',
  2: '추진 배경 및 필요성',
  3: '현황 및 문제점',
  4: '사업 목표',
  5: '사업 내용 및 추진 방법',
  6: '소요 예산 및 추진 일정',
  7: '기대효과 및 성과지표',
}

/**
 * 표준 절차 7단계의 초안 섹션을 자료 창고 근거만으로 구성한다.
 * 근거가 없는 항목은 채우지 않고 [확인 필요]로 남긴다.
 */
export function mockGenerateSection(
  step: number,
  projectName: string,
  docs: StoredDocument[],
): { text: string; note: string } {
  const title = STEP_INTRO[step] ?? `${step}단계`
  if (docs.length === 0) {
    return {
      text:
        `## ${step}. ${title}\n\n` +
        `자료 창고에서 이 항목에 대응하는 근거를 찾지 못했습니다.\n` +
        `근거 없이 문장을 생성하지 않습니다. 아래 항목을 자료 창고에 먼저 등재하십시오.\n\n` +
        `- ${title} 작성에 필요한 함평군 자료 [확인 필요]\n`,
      note: '자료 창고에 대응 근거가 없어 초안을 생성하지 않았습니다.',
    }
  }

  const marker = (i: number) => `[D${i + 1}]`
  const body: string[] = [`## ${step}. ${title}`, '']

  if (step === 1) {
    body.push('| 구분 | 내용 |')
    body.push('| --- | --- |')
    body.push(`| 사업명 | ${projectName} |`)
    body.push('| 사업기간 | [확인 필요] |')
    body.push('| 총사업비 | [확인 필요] |')
    body.push('| 재원 분담 | 국비 [확인 필요] / 도비 [확인 필요] / 군비 [확인 필요] |')
    body.push('| 사업 위치 | [확인 필요] |')
    body.push('| 수행주체 | 전라남도 함평군 |')
    body.push('')
    body.push('### 사업 요약')
    // 개요는 수치 사실만 인용한다. 서술형 문장은 2단계 이후에서 다룬다.
    let quoted = 0
    docs.forEach((doc, i) => {
      if (quoted >= 3) return
      const fact = keyFacts(doc, 3).find((f) => UNIT_FACT.test(f))
      if (!fact) return
      body.push(`${fact}${verificationCaveat(doc)} ${marker(i)}`)
      quoted++
    })
    body.push('본 사업은 위 여건을 배경으로 추진하는 사업이며, 세부 규모와 일정은 [확인 필요] 항목 확정 후 기재한다.')
  } else if (step === 6) {
    body.push('### 재원 분담')
    body.push('| 구분 | 금액 | 비율 |')
    body.push('| --- | --- | --- |')
    body.push('| 국비 | [확인 필요] | [확인 필요] |')
    body.push('| 도비 | [확인 필요] | [확인 필요] |')
    body.push('| 군비 | [확인 필요] | [확인 필요] |')
    body.push('| 합계 | [확인 필요] | 100% |')
    body.push('')
    body.push('### 산정 시 유의사항')
    docs.slice(0, 3).forEach((doc, i) => {
      const fact = keyFacts(doc, 1)[0]
      if (fact) body.push(`- ${fact}${verificationCaveat(doc)} ${marker(i)}`)
    })
    body.push('- 군비 부담률은 함평군 재정 여건을 고려해 결정하며, 산출 내역의 합계는 제출 전 재계산으로 검산한다.')
    body.push('')
    body.push('### 추진 일정')
    body.push('| 구분 | 1분기 | 2분기 | 3분기 | 4분기 |')
    body.push('| --- | --- | --- | --- | --- |')
    body.push('| 주요 공정 | [확인 필요] | [확인 필요] | [확인 필요] | [확인 필요] |')
  } else {
    // 2~5, 7단계 — 근거를 문단으로 엮는다
    docs.forEach((doc, i) => {
      const facts = keyFacts(doc, step === 7 ? 2 : 3)
      if (facts.length === 0) return
      body.push(`**${doc.title}**`)
      for (const f of facts) {
        body.push(`${f}${verificationCaveat(doc)} ${marker(i)}`)
      }
      body.push('')
    })
    if (step === 4 || step === 7) {
      body.push('| 지표 | 현재값 | 목표값 | 측정 방법 |')
      body.push('| --- | --- | --- | --- |')
      body.push('| [확인 필요] | [기준값 확인 필요] | [확인 필요] | [확인 필요] |')
      body.push('')
      body.push('산식과 전제값이 확정되지 않은 효과는 기재하지 않는다.')
    }
  }

  return {
    text: body.join('\n'),
    note:
      `데모 모드: 자료 창고 문서 ${docs.length}건의 내용만으로 구성했습니다. ` +
      `문장 다듬기와 논리 전개는 Claude API 또는 로컬 AI 모드에서 수행됩니다.`,
  }
}

/** 지시문 '바로 실행'을 데모 모드에서 처리한다. */
export function mockRunPrompt(resolved: string, docs: StoredDocument[]): string {
  const lines: string[] = []
  lines.push('### 데모 모드 실행 결과')
  lines.push('')
  lines.push('데모 모드는 외부 AI를 호출하지 않으므로 지시문 실행 결과를 생성하지 않습니다.')
  lines.push('아래는 실제 AI 모드에서 전송될 내용 그대로입니다. 설정에서 모드를 전환하면 실행됩니다.')
  lines.push('')
  lines.push('**전송될 지시문**')
  lines.push('')
  lines.push('```')
  lines.push(resolved)
  lines.push('```')
  lines.push('')
  if (docs.length) {
    lines.push(`**함께 전송될 자료 창고 근거 ${docs.length}건** — 이 범위 밖의 자료는 전송되지 않습니다.`)
    lines.push('')
    docs.forEach((d, i) => lines.push(`- [D${i + 1}] ${d.title} — ${d.source}`))
  } else {
    lines.push('**함께 전송될 근거**: 없음 (자료 창고 검색 결과 0건)')
  }
  return lines.join('\n')
}
