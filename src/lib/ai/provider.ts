/**
 * AI 제공자 공통 인터페이스
 *
 * 제안서 4-4 — 본 사업 적용 모델은 "젬마4 또는 외부 상용 AI, 보안 요건 확인 후 착수 시 확정"이다.
 * 따라서 앱은 특정 모델에 묶이지 않고 3가지 모드를 전환할 수 있어야 한다.
 *   demo      규칙 기반 · 외부 전송 없음 (키 없이 전 기능 시연)
 *   anthropic Claude API (외부 상용 AI)
 *   local     OpenAI 호환 엔드포인트 (젬마4 내부 서버 설치 시나리오)
 */
import type { AiMode } from '../types'

export interface GenerateRequest {
  system: string
  prompt: string
  maxTokens?: number
}

export interface GenerateResult {
  text: string
  mode: AiMode
  model: string
  /** 사용자에게 보여줄 참고 메시지 (데모 모드 안내, 폴백 사유 등) */
  note?: string
}

export interface Provider {
  readonly mode: AiMode
  readonly model: string
  generate(req: GenerateRequest): Promise<GenerateResult>
}

/**
 * 모든 생성 요청에 공통으로 붙는 시스템 지침.
 * 제안서 5-2 ㉮·㉯의 코드 수준 강제 지점이다.
 */
export const GUARDRAIL = `당신은 전라남도 함평군청의 국비 공모 제안서 작성을 돕는 보조 도구다.

절대 규칙:
1. 제공된 '함평군 자료 창고' 근거 안에 있는 사실만 사용한다. 근거 밖의 사실을 만들어내지 않는다.
2. 근거에서 가져온 사실을 서술한 문장은 문장 끝에 [D1], [D2] 형식으로 출처 마커를 붙인다.
   여러 근거를 쓴 문장은 [D1][D3]처럼 나열한다.
3. 근거가 없어 채울 수 없는 항목은 [확인 필요]로 표시하고 비워 둔다. 추정치나 예시 숫자를 쓰지 않는다.
4. 근거의 수치를 바꾸거나 반올림하지 않는다. 단위를 그대로 옮긴다.
5. 근거가 '확인 필요' 또는 '가정치'로 표시된 값을 인용할 때는 그 사실을 문장 안에 함께 밝힌다.
6. 과장 표현(획기적, 혁신적, 최초의, 최고의)을 쓰지 않는다.
7. 개인정보나 대외비로 보이는 내용이 근거에 섞여 있으면 사용하지 않고 그 사실을 알린다.

출력은 한국어 행정 문서 어투로 작성한다.`

export function buildEvidencePrompt(citationBlock: string): string {
  if (!citationBlock.trim()) {
    return '[함평군 자료 창고 근거]\n(검색 결과 없음 — 근거 없이 작성하지 말고 [확인 필요]로 표시할 것)'
  }
  return `[함평군 자료 창고 근거]\n${citationBlock}`
}
