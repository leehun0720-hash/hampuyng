/**
 * JSON 파일 저장소
 *
 * 군청 내부망 단독 서버 배포를 전제로 네이티브 의존성 없이 동작해야 하므로
 * DB 대신 data/ 디렉터리의 JSON 파일을 사용한다.
 * 최초 실행 시 seed 데이터로 자동 초기화된다.
 */
import { promises as fs } from 'fs'
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

const DATA_DIR = path.join(process.cwd(), 'data')

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

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

function filePath(name: keyof Collections) {
  return path.join(DATA_DIR, `${name}.json`)
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

async function readRaw<K extends keyof Collections>(name: K): Promise<Collections[K]> {
  await ensureDir()
  try {
    const raw = await fs.readFile(filePath(name), 'utf-8')
    return JSON.parse(raw) as Collections[K]
  } catch {
    const seeded = SEEDS[name]() as Collections[K]
    await writeRaw(name, seeded)
    return seeded
  }
}

/** 임시 파일에 기록한 뒤 rename 하여 중간에 끊겨도 파일이 깨지지 않게 한다. */
async function writeRaw<K extends keyof Collections>(name: K, value: Collections[K]): Promise<void> {
  await ensureDir()
  const file = filePath(name)
  const tmp = `${file}.${process.pid}.${++tmpCounter}.tmp`
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), 'utf-8')
  await fs.rename(tmp, file)
}

let tmpCounter = 0

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
