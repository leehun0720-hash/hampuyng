'use client'

import { useFormStatus } from 'react-dom'
import { createDraftFromAnnouncement } from '@/app/actions/drafts'

function Inner() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-gov-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-gov-700 disabled:bg-ink-300"
    >
      {pending ? '생성 중…' : '이 공고로 초안 작성 시작 →'}
    </button>
  )
}

export function CreateDraftButton({ announcementId }: { announcementId: string }) {
  return (
    <form action={createDraftFromAnnouncement}>
      <input type="hidden" name="announcementId" value={announcementId} />
      <Inner />
    </form>
  )
}
