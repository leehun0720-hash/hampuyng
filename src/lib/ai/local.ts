/**
 * 로컬 설치형 제공자 (제안서 4-4 "젬마4 … 군청 내부 서버 직접 설치 가능")
 *
 * Ollama / vLLM / LM Studio 등이 공통으로 제공하는 OpenAI 호환
 * /chat/completions 엔드포인트를 사용한다.
 * 이 모드에서는 자료가 군청 내부망을 벗어나지 않는다.
 */
import type { GenerateRequest, GenerateResult, Provider } from './provider'

export class LocalProvider implements Provider {
  readonly mode = 'local' as const

  constructor(
    readonly model: string,
    private baseUrl: string,
  ) {}

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const url = `${this.baseUrl.replace(/\/+$/, '')}/chat/completions`

    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          max_tokens: req.maxTokens ?? 4096,
          messages: [
            { role: 'system', content: req.system },
            { role: 'user', content: req.prompt },
          ],
        }),
      })
    } catch (e) {
      throw new Error(
        `로컬 AI 서버에 연결하지 못했습니다 (${url}). ` +
          `서버가 실행 중인지 확인하거나 데모 모드로 전환하십시오. 원인: ${(e as Error).message}`,
      )
    }

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`로컬 AI 호출 실패 (${res.status}): ${body.slice(0, 300)}`)
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const text = data.choices?.[0]?.message?.content ?? ''

    return { text, mode: this.mode, model: this.model }
  }
}
