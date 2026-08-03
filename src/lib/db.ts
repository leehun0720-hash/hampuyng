/**
 * JSON 파일 저장소
 *
 * 군청 내부망 단독 서버 배포를 전제로 네이티브 의존성 없이 동작해야 하므로
 * DB 대신 data/ 디렉터리의 JSON 파일을 사용한다.
 * 최초 실행 시 seed 데이터로 자동 초기화된다.
 */
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import type {
  Announcement,
  AuditEntry,
  DiagnosisAxis,
  Draft,
  MetricRecord,
  PromptTemplate,
  ReviewRecord,
  Settings,
  StoredDocument,
  TrainingRecord,
} from './types'
import {
  seedAnnouncements,
  seedAudit,
  seedDiagnosis,
  seedDocuments,
  seedMetrics,
  seedPrompts,
  seedSettings,
  seedTraining,
} from './seed'

const PRIMARY_DIR = path.join(process.cwd(), 'data')

type Collections = {
  documents: StoredDocument[]
  announcements: Announcement[]
  drafts: Draft[]
  prompts: PromptTemplate[]
  reviews: ReviewRecord[]
  metrics: MetricRecord[]
  diagnosis: DiagnosisAxis[]
  training: TrainingRecord[]
  audit: AuditEntry[]
  settings: Settings
}

const SEEDS: { [K in keyof Collections]: () => Collections[K] } = {
  documents: seedDocuments,
  announcements: seedAnnouncements,
  drafts: () => [],
  prompts: seedPrompts,
  reviews: () => [],
  metrics: seedMetrics,
  diagnosis: seedDiagnosis,
  training: seedTraining,
  audit: seedAudit,
  settings: seedSettings,
}

/**
 * 저장 위치 결정 — 쓰기 가능한 곳을 실제로 시험해 보고 고른다.
 *
 * 이전 구현은 파일 작업 중 나오는 오류 코드(EROFS/EACCES/EPERM)를 보고 판단했는데,
 * 호스팅 환경마다 오류 코드가 달라 폴백이 걸리지 않고 화면이 500으로 죽었다.
 * 그래서 오류 코드를 추측하지 않고, 시작할 때 실제로 파일을 써 보고 결정한다.
 *
 *   1) <프로젝트>/data      — 로컬·내부망 단독 서버. 영구 저장
 *   2) <임시디렉터리>/…      — 서버리스(Lambda의 /tmp 등). 인스턴스가 사는 동안만 유지
 *   3) 메모리                — 위 둘 다 불가능한 경우
 *
 * 2·3번은 영구 저장이 아니므로 isEphemeral()이 true가 되고 화면에 경고 배너가 뜬다.
 */
type Backend = { kind: 'fs'; dir: string; durable: boolean } | { kind: 'memory'; durable: false }

const FALLBACK_DIR = path.join(os.tmpdir(), 'hampyung-ax-data')

let backend: Backend | null = null
let backendPromise: Promise<Backend> | null = null

async function canWrite(dir: string): Promise<boolean> {
  const probe = path.join(dir, `.probe-${process.pid}-${Date.now().toString(36)}`)
  try {
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(probe, 'ok', 'utf-8')
    await fs.unlink(probe).catch(() => {})
    return true
  } catch {
    return false
  }
}

async function resolveBackend(): Promise<Backend> {
  if (process.env.HAMPYUNG_EPHEMERAL === '1') return { kind: 'memory', durable: false }

  if (await canWrite(PRIMARY_DIR)) return { kind: 'fs', dir: PRIMARY_DIR, durable: true }

  if (await canWrite(FALLBACK_DIR)) {
    console.warn(
      `[hampyung-ax] '${PRIMARY_DIR}'에 기록할 수 없어 '${FALLBACK_DIR}'를 사용합니다. ` +
        `인스턴스가 재시작되면 자료가 사라집니다.`,
    )
    return { kind: 'fs', dir: FALLBACK_DIR, durable: false }
  }

  console.warn('[hampyung-ax] 쓰기 가능한 디렉터리가 없어 메모리에 저장합니다. 자료가 영구 보존되지 않습니다.')
  return { kind: 'memory', durable: false }
}

function getBackend(): Promise<Backend> {
  if (!backendPromise) {
    backendPromise = resolveBackend().then((b) => {
      backend = b
      return b
    })
  }
  return backendPromise
}

/** 저장이 휘발성인지 — 화면 경고 배너 표시에 쓴다. read() 이후에 호출해야 정확하다. */
export function isEphemeral(): boolean {
  return backend !== null && !backend.durable
}

function filePath(dir: string, name: keyof Collections) {
  return path.join(dir, `${name}.json`)
}

/**
 * 컬렉션별 직렬화 큐.
 *
 * Next.js는 한 화면에서 여러 read()를 동시에 실행하고, 서버 액션도 병렬로 들어온다.
 * 직렬화하지 않으면 두 가지 사고가 난다.
 *   1) 파일이 없어 동시에 시드를 쓰면 임시 파일 rename이 충돌한다 (ENOENT)
 *   2) update()의 읽기-수정-쓰기 사이에 다른 쓰기가 끼어들면 갱신이 유실된다
 * 컬렉션 단위로 순서를 강제해 두 경우를 모두 막는다.
 */
const queues = new Map<string, Promise<unknown>>()

function enqueue<T>(name: string, task: () => Promise<T>): Promise<T> {
  const prev = queues.get(name) ?? Promise.resolve()
  const next = prev.then(task, task)
  // 큐가 끊기지 않도록 실패해도 체인은 유지한다
  queues.set(
    name,
    next.catch(() => undefined),
  )
  return next
}

/** 파일 저장이 불가능할 때 쓰는 메모리 저장소. */
const memory = new Map<string, unknown>()

let tmpCounter = 0

/**
 * 컬렉션을 읽는다. 어떤 경우에도 예외를 밖으로 내보내지 않는다.
 *
 * 저장소 문제로 화면 전체가 500으로 죽는 것보다, 시드 데이터로라도 화면이 뜨는 편이 낫다.
 * 실제 오류는 서버 로그에 남겨 원인을 추적할 수 있게 한다.
 */
async function readRaw<K extends keyof Collections>(name: K): Promise<Collections[K]> {
  const be = await getBackend()

  if (be.kind === 'memory') {
    if (!memory.has(name)) memory.set(name, SEEDS[name]())
    return memory.get(name) as Collections[K]
  }

  try {
    const raw = await fs.readFile(filePath(be.dir, name), 'utf-8')
    return JSON.parse(raw) as Collections[K]
  } catch (e) {
    const code = (e as NodeJS.ErrnoException)?.code
    // 파일이 아직 없는 것은 정상 — 시드로 만든다. 그 밖의 오류는 로그로 남긴다.
    if (code !== 'ENOENT') {
      console.error(`[hampyung-ax] '${name}' 읽기 실패 — 시드로 대체합니다.`, e)
    }
    const seeded = SEEDS[name]() as Collections[K]
    await writeRaw(name, seeded)
    return seeded
  }
}

/**
 * 임시 파일에 기록한 뒤 rename 하여 중간에 끊겨도 파일이 깨지지 않게 한다.
 * 기록에 실패하면 메모리에 담아 두고 화면은 계속 살려 둔다.
 */
async function writeRaw<K extends keyof Collections>(name: K, value: Collections[K]): Promise<void> {
  const be = await getBackend()

  if (be.kind === 'memory') {
    memory.set(name, value)
    return
  }

  const file = filePath(be.dir, name)
  const tmp = `${file}.${process.pid}.${++tmpCounter}.tmp`
  try {
    await fs.writeFile(tmp, JSON.stringify(value, null, 2), 'utf-8')
    await fs.rename(tmp, file)
  } catch (e) {
    console.error(`[hampyung-ax] '${name}' 저장 실패 — 메모리에만 보관합니다.`, e)
    backend = { kind: 'memory', durable: false }
    backendPromise = Promise.resolve(backend)
    memory.set(name, value)
  }
}

/** 컬렉션 전체를 읽는다. 파일이 없으면 시드로 생성한다. */
export function read<K extends keyof Collections>(name: K): Promise<Collections[K]> {
  return enqueue(name, () => readRaw(name))
}

export function write<K extends keyof Collections>(name: K, value: Collections[K]): Promise<void> {
  return enqueue(name, () => writeRaw(name, value))
}

/** 읽고-수정하고-쓰는 패턴을 하나의 원자적 작업으로 처리한다. */
export function update<K extends keyof Collections>(
  name: K,
  mutate: (current: Collections[K]) => Collections[K],
): Promise<Collections[K]> {
  return enqueue(name, async () => {
    const current = await readRaw(name)
    const next = mutate(current)
    await writeRaw(name, next)
    return next
  })
}

/** 감사 이력 한 줄 기록 — 제안서 5-2 "검토 이력 자동 기록" */
export async function logAudit(entry: Omit<AuditEntry, 'id' | 'at'>): Promise<void> {
  await update('audit', (list) => [
    { ...entry, id: newId('AU'), at: new Date().toISOString() },
    ...list,
  ].slice(0, 500))
}

let counter = 0
/** 충돌 없는 짧은 ID. Math.random 대신 시각+카운터를 쓴다. */
export function newId(prefix: string): string {
  counter = (counter + 1) % 100000
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`
}
