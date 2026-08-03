import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // data/ 디렉터리의 JSON 저장소를 서버 런타임에서 직접 읽고 쓴다.
  // 군청 내부망 단독 서버 배포를 전제로 하므로 외부 DB 의존성을 두지 않는다.
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

export default nextConfig
