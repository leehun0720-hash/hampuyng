/**
 * Claude API 제공자 (제안서 4-4 "외부 상용 AI")
 *
 * SDK를 쓰지 않고 Messages API를 fetch로 직접 호출한다.
 * 군청 내부망 배포 시 의존성을 최소화하기 위함이다.
 */
import type { GenerateRequest, GenerateResult, Provider } from './provider'

const API_URL = 'https://api.anthropic.com/v1/messages'
const API_VERSION = '2023-06-01'

export class AnthropicProvider implements Provider {
  readonly mode = 'anthropic' as const

  constructor(
    readonly model: string,
    private apiKey: string,
  ) {}

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    if (!this.apiKey) {
      throw new Error('Claude API 키가 설정되지 않았습니다. 설정 화면에서 키를 입력하거나 데모 모드로 전환하십시오.')
    }

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: req.maxTokens ?? 4096,
        system: req.system,
        messages: [{ role: 'user', content: req.prompt }],
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Claude API 호출 실패 (${res.status}): ${body.slice(0, 300)}`)
    }

    const data = (await res.json()) as { content?: { type: string; text?: string }[] }
    const text = (data.content ?? [])
      .filter((c) => c.type === 'text')
      .map((c) => c.text ?? '')
      .join('')

    return { text, mode: this.mode, model: this.model }
  }
}
