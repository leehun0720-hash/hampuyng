import type { Metadata } from 'next'
import { Sidebar } from '@/components/Sidebar'
import { read } from '@/lib/db'
import './globals.css'

export const metadata: Metadata = {
  title: '함평군 국비 공모 제안서 작성 지원 시스템',
  description: '함평군 행정 AI 전환(AX) 1단계 — 국비 공모 제안서 자체 작성 체계',
}

export const dynamic = 'force-dynamic'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, documents] = await Promise.all([read('settings'), read('documents')])

  return (
    <html lang="ko">
      <body>
        <div className="flex h-screen overflow-hidden">
          <Sidebar aiMode={settings.aiMode} docCount={documents.length} />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  )
}
