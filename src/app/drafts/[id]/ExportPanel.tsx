'use client'

import { useState } from 'react'
import { Card } from '@/components/ui'
import type { Draft } from '@/lib/types'

/**
 * 초안 내보내기
 *
 * 한글(HWP) 파일 직접 생성은 과업 범위 밖(제안서 4-5 "시스템 개발")이므로,
 * 한글에 그대로 붙여넣을 수 있는 텍스트와 마크다운 두 형태로 내보낸다.
 */
export function ExportPanel({
  draft,
  citedDocs,
}: {
  draft: Draft
  citedDocs: { title: string; source: string }[]
}) {
  const [format, setFormat] = useState<'markdown' | 'plain'>('plain')
  const [copied, setCopied] = useState(false)

  const filled = draft.sections.filter((s) => s.status !== 'empty')

  const markdown = [
    `# ${draft.title}`,
    '',
    `> ${draft.announcementTitle}`,
    '',
    ...filled.map((s) => s.content),
    '',
    '---',
    '',
    '## 인용 근거 목록',
    '',
    ...citedDocs.map((d, i) => `${i + 1}. ${d.title} — ${d.source}`),
  ].join('\n\n')

  // 한글 붙여넣기용: 마크다운 기호를 걷어내고 표는 탭 구분으로 바꾼다
  const plain = markdown
    .split('\n')
    .map((line) => {
      if (/^\s*\|[\s:|-]+\|\s*$/.test(line)) return null
      if (line.trim().startsWith('|')) {
        return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim()).join('\t')
      }
      return line
        .replace(/^#{1,4}\s*/, '')
        .replace(/^\s*>\s*/, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/^\s*[-*]\s+/, '· ')
    })
    .filter((l) => l !== null)
    .join('\n')

  const text = format === 'markdown' ? markdown : plain

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  function download() {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${draft.title.replace(/[\\/:*?"<>|]/g, '_')}.${format === 'markdown' ? 'md' : 'txt'}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card
      title="초안 내보내기"
      desc="출처 마커 [Dn]와 인용 근거 목록이 함께 포함됩니다. 한글 파일 직접 생성은 과업 범위 밖입니다(제안서 4-5)."
      action={
        <div className="flex items-center gap-1.5">
          <div className="flex rounded border border-ink-300">
            {(['plain', 'markdown'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`px-2.5 py-1 text-[11px] font-semibold transition ${
                  format === f ? 'bg-ink-800 text-white' : 'bg-white text-ink-600 hover:bg-ink-50'
                }`}
              >
                {f === 'plain' ? '한글 붙여넣기용' : '마크다운'}
              </button>
            ))}
          </div>
          <button
            onClick={copy}
            disabled={filled.length === 0}
            className="rounded border border-ink-300 px-2.5 py-1 text-[11px] font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-40"
          >
            {copied ? '복사됨' : '복사'}
          </button>
          <button
            onClick={download}
            disabled={filled.length === 0}
            className="rounded bg-gov-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-gov-700 disabled:bg-ink-300"
          >
            내려받기
          </button>
        </div>
      }
    >
      {filled.length === 0 ? (
        <p className="text-[12px] text-ink-400">생성된 단계가 없어 내보낼 내용이 없습니다.</p>
      ) : (
        <pre className="max-h-72 overflow-auto rounded border border-ink-200 bg-ink-50 px-3.5 py-3 font-mono text-[11px] leading-relaxed text-ink-600">
          {text}
        </pre>
      )}
    </Card>
  )
}
