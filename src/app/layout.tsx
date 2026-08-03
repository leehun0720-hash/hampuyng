import type { Metadata } from 'next'
import { MobileNav, Sidebar } from '@/components/Sidebar'
import { isEphemeral, read } from '@/lib/db'
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
            <MobileNav aiMode={settings.aiMode} docCount={documents.length} />
            {/* 읽기 전용 호스팅에서는 입력한 자료가 사라진다. 반드시 알려야 한다. */}
            {isEphemeral() && (
              <div className="border-b border-warn-500/30 bg-warn-50 px-4 py-2.5 sm:px-8">
                <p className="mx-auto max-w-6xl text-[12px] leading-relaxed text-warn-600">
                  <strong>임시 저장 모드</strong> — 이 서버는 파일 저장이 불가능한 환경(서버리스 호스팅)입니다.
                  입력하신 자료·초안·검토 기록은 <strong>서버가 재시작되면 사라집니다</strong>. 기능 시연용으로만
                  사용하시고, 실제 업무에는 파일 저장이 가능한 군청 내부 서버에 설치해 사용하십시오.
                </p>
              </div>
            )}
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  )
}
