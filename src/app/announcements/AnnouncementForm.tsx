'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { analyzeAnnouncement } from '@/app/actions/announcements'
import { Notice } from '@/components/ui'
import { SAMPLE_ANNOUNCEMENT } from './sample'

const INPUT =
  'w-full rounded border border-ink-300 bg-white px-2.5 py-1.5 text-[13px] text-ink-800 outline-none focus:border-gov-500 focus:ring-2 focus:ring-gov-500/15'
const LABEL = 'mb-1 block text-[11px] font-semibold text-ink-600'

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="rounded bg-gov-600 px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-gov-700 disabled:cursor-not-allowed disabled:bg-ink-300"
    >
      {pending ? '분석 중… (AI 처리 시간이 자동 계측됩니다)' : '공고문 분석 시작'}
    </button>
  )
}

export function AnnouncementForm() {
  const [text, setText] = useState('')
  const [fileNote, setFileNote] = useState('')

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (/\.(pdf|hwp|hwpx|docx?)$/i.test(file.name)) {
      setFileNote(
        `${file.name} — 이 형식은 직접 읽을 수 없습니다. 파일을 열어 본문을 복사한 뒤 아래에 붙여넣으십시오. ` +
          `(PDF·HWP 자동 변환은 본 사업 과업 범위 밖입니다 — 제안서 4-5)`,
      )
      return
    }
    const content = await file.text()
    setText(content)
    setFileNote(`${file.name} (${content.length.toLocaleString()}자) 읽기 완료`)
  }

  return (
    <form action={analyzeAnnouncement} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className={LABEL}>공고명</label>
          <input name="title" className={INPUT} placeholder="예: 2027년 지역거점 조성사업 공모" />
        </div>
        <div>
          <label className={LABEL}>소관 부처</label>
          <input name="ministry" className={INPUT} placeholder="예: 국토교통부" />
        </div>
        <div>
          <label className={LABEL}>공모 사업명</label>
          <input name="program" className={INPUT} placeholder="예: 미래 모빌리티 혁신거점 조성" />
        </div>
        <div>
          <label className={LABEL}>접수 마감</label>
          <input name="deadline" className={INPUT} placeholder="예: 2026. 9. 15. 18:00" />
        </div>
      </div>

      <div>
        <label className={LABEL}>사업비 규모 (원문 기재)</label>
        <input name="budgetNote" className={INPUT} placeholder="예: 총사업비 200억 원 내외, 국비 50% 이내" />
      </div>

      <div>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <label className={LABEL}>공고문 본문 * — 평가·배점표가 포함된 부분을 반드시 넣으십시오</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setText(SAMPLE_ANNOUNCEMENT)
                setFileNote('예시 공고문을 불러왔습니다. 배점표 형식 인식을 확인하기 위한 가상 공고문입니다.')
              }}
              className="rounded border border-ink-300 px-2 py-1 text-[11px] font-semibold text-ink-600 hover:bg-ink-50"
            >
              예시 공고문 불러오기
            </button>
            <label className="cursor-pointer rounded border border-ink-300 px-2 py-1 text-[11px] font-semibold text-ink-600 hover:bg-ink-50">
              파일 선택 (.txt/.md)
              <input type="file" accept=".txt,.md,.csv" onChange={onFile} className="hidden" />
            </label>
          </div>
        </div>
        <textarea
          name="rawText"
          required
          rows={16}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="공고문 전문을 붙여넣으십시오."
          className={`${INPUT} font-mono text-xs leading-relaxed`}
        />
        <p className="mt-1 text-[11px] text-ink-400">{text.length.toLocaleString()}자</p>
      </div>

      {fileNote && <Notice tone="warn">{fileNote}</Notice>}

      <Notice>
        분석은 <strong>공고문 원문</strong>과 <strong>함평군 자료 창고</strong>만을 사용합니다. 그 밖의 외부 자료는
        참조하지 않으며, 자료 창고에 근거가 없는 항목은 &ldquo;근거 없음&rdquo;으로 표시됩니다.
      </Notice>

      <div className="flex justify-end">
        <SubmitButton disabled={text.trim().length < 30} />
      </div>
    </form>
  )
}
