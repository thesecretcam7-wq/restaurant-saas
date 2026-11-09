// Bounded READ-ONLY production sampling, NOT a full business-capacity certification.
// Run explicitly: node scripts/capacity-readonly.mjs --run-readonly
// Requires .env.local (or env vars). Credentials and response records are never logged.
import { mkdir, writeFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'

const RUN = process.argv.includes('--run-readonly')
const CONFIG = {
  sessions: [5, 10, 20, 40],
  secondsPerStage: 30,
  requestIntervalMs: 5000,
  maxConcurrentRequests: 8,
  requestTimeoutMs: 5000,
  p95LimitMs: 2000,
  consecutiveSlowLimitMs: 2500,
  minAvailableMemoryMB: 64,
}
if (!RUN) {
  console.log(JSON.stringify({ dryRun: true, config: CONFIG, note: 'GET only; one existing tenant; no writes, no synthetic production accounts. Explicit --run-readonly required.' }))
  process.exit(0)
}
try { process.loadEnvFile('.env.local') } catch {}
const origin = 'https://www.eccofoodapp.com'
const database = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (database !== 'https://csdooyggiuhzovehykna.supabase.co' || !key) throw Error('Expected Eccofood environment is missing')
const tenantId = '2cb81ce4-1a4c-411f-aa6a-814d232b3a45'
const headers = { apikey: key, Authorization: `Bearer ${key}` }
const since = new Date(Date.now() - 30 * 86400_000).toISOString()
const workloads = [
  { name: 'pos-bootstrap', url: `${origin}/api/pos/bootstrap?tenantId=${tenantId}` },
  { name: 'tv-public', url: `${origin}/api/tv-menu/public?tenantId=${tenantId}` },
  { name: 'pos-open-orders', table: 'orders', params: { select: 'id,order_number,table_number,waiter_name,notes,total,payment_status,status,created_at,items', tenant_id: `eq.${tenantId}`, delivery_type: 'eq.dine-in', payment_status: 'eq.pending', status: 'neq.cancelled', waiter_name: 'eq.TPV', order: 'created_at.desc', limit: '60' } },
  { name: 'monthly-sales-page', table: 'orders', params: { select: 'id,total,payment_method,payment_breakdown,created_at,items', tenant_id: `eq.${tenantId}`, payment_status: 'eq.paid', created_at: `gte.${since}`, order: 'created_at.desc,id.desc', limit: '1000' } },
  { name: 'paid-bills-page', table: 'cash_bill_payments', params: { select: 'id,supplier_name,concept,amount,paid_at,payment_method', tenant_id: `eq.${tenantId}`, paid_at: `gte.${since}`, order: 'paid_at.desc,id.desc', limit: '1000' } },
  { name: 'cloud-health', url: `${origin}/api/pos/cloud-health?tenantId=${tenantId}` },
]
for (const work of workloads) {
  if (work.table) {
    work.url = `${database}/rest/v1/${work.table}?${new URLSearchParams(work.params)}`
    work.headers = headers
  }
}
const controllers = new Set()
let stopped = null
const stop = reason => {
  stopped ||= reason
  for (const controller of controllers) controller.abort()
}
process.on('SIGINT', () => stop('Interrupted by operator'))
const sleep = ms => new Promise(resolve => setTimeout(resolve, Math.max(0, ms)))
const percentile = (values, fraction) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted.length ? Math.round(sorted[Math.ceil(sorted.length * fraction) - 1] * 10) / 10 : null
}
async function metrics() {
  const response = await fetch(`${database}/customer/v1/privileged/metrics`, {
    headers: { Authorization: `Basic ${Buffer.from(`service_role:${key}`).toString('base64')}` },
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) throw Error(`Metrics HTTP ${response.status}`)
  const raw = await response.text(), sample = { at: Date.now(), cpu: {} }
  for (const line of raw.split('\n')) {
    const name = line.split(/[ {]/)[0], value = Number(line.slice(line.lastIndexOf(' ') + 1))
    if (name === 'node_cpu_seconds_total') {
      const mode = /mode="([^"]+)"/.exec(line)?.[1]
      if (mode) sample.cpu[mode] = (sample.cpu[mode] || 0) + value
    }
    if (['node_memory_MemAvailable_bytes', 'node_memory_MemTotal_bytes', 'node_memory_SwapFree_bytes', 'node_memory_SwapTotal_bytes', 'node_vmstat_pswpin', 'node_vmstat_pswpout'].includes(name)) sample[name] = value
  }
  return sample
}
function resourceDelta(before, after) {
  const delta = Object.fromEntries(Object.keys(after.cpu).map(mode => [mode, Math.max(0, after.cpu[mode] - (before.cpu[mode] || 0))]))
  const total = Object.values(delta).reduce((a, b) => a + b, 0)
  return {
    cpuBusyPercent: total ? Math.round((total - (delta.idle || 0) - (delta.iowait || 0)) / total * 1000) / 10 : null,
    ioWaitPercent: total ? Math.round((delta.iowait || 0) / total * 1000) / 10 : null,
    memoryAvailableMB: Math.round(after.node_memory_MemAvailable_bytes / 2 ** 20),
    swapUsedMB: Math.round((after.node_memory_SwapTotal_bytes - after.node_memory_SwapFree_bytes) / 2 ** 20),
    swapInPages: after.node_vmstat_pswpin - before.node_vmstat_pswpin,
    swapOutPages: after.node_vmstat_pswpout - before.node_vmstat_pswpout,
  }
}
async function request(work, scheduledAt) {
  const controller = new AbortController(), started = performance.now()
  controllers.add(controller)
  let timedOut = false
  const timeout = setTimeout(() => { timedOut = true; controller.abort() }, CONFIG.requestTimeoutMs)
  try {
    const response = await fetch(work.url, { method: 'GET', headers: work.headers, cache: 'no-store', signal: controller.signal })
    const body = await response.arrayBuffer()
    if (response.status !== 200) throw Error(`HTTP ${response.status}`)
    return { name: work.name, ok: true, ms: performance.now() - scheduledAt, serviceMs: performance.now() - started, bytes: body.byteLength, status: response.status }
  } catch (error) {
    return { name: work.name, ok: false, ms: performance.now() - scheduledAt, error: timedOut ? `Request deadline ${CONFIG.requestTimeoutMs} ms` : stopped ? 'Cancelled after protective stop' : error.message }
  } finally {
    clearTimeout(timeout)
    controllers.delete(controller)
  }
}
const report = { at: new Date().toISOString(), config: CONFIG, scope: { realDatabase: true, methods: ['GET'], tenantsTested: 1, cachedWorkingSet: true, writesTested: false, authFlowTested: false, fullBusinessCapacityEstablished: false }, warmup: [], stages: [] }
await mkdir('output/capacity', { recursive: true })
try {
  // Validate each endpoint once before increasing load; do not measure broken requests as capacity.
  for (const work of workloads) {
    const result = await request(work, performance.now())
    report.warmup.push(result)
    if (!result.ok) throw Error(`Warmup ${work.name}: ${result.error}`)
  }
  for (const sessions of CONFIG.sessions) {
    const before = await metrics()
    if (before.node_memory_MemAvailable_bytes < CONFIG.minAvailableMemoryMB * 2 ** 20) { stop('Low available memory before stage'); break }
    const stage = { sessions, targetRequestsPerSecond: sessions * 1000 / CONFIG.requestIntervalMs, passed: false }
    report.stages.push(stage)
    const observations = [], pending = new Set(), start = performance.now()
    const planned = sessions * CONFIG.secondsPerStage * 1000 / CONFIG.requestIntervalMs
    let consecutiveSlow = 0, maxInFlight = 0
    for (let index = 0; index < planned && !stopped; index++) {
      const due = start + index * CONFIG.requestIntervalMs / sessions
      await sleep(due - performance.now())
      if (stopped) break
      if (pending.size >= CONFIG.maxConcurrentRequests) await Promise.race(pending)
      if (stopped) break
      if (performance.now() - due > CONFIG.p95LimitMs) { stop('Load generator queue exceeded latency limit'); break }
      const task = request(workloads[index % workloads.length], due).then(result => {
        observations.push(result)
        consecutiveSlow = result.ms > CONFIG.consecutiveSlowLimitMs ? consecutiveSlow + 1 : 0
        if (!result.ok) stop(`Stopped on ${result.name}: ${result.error}`)
        else if (consecutiveSlow >= 2) stop('Two consecutive responses slower than 2.5 seconds')
      }).finally(() => pending.delete(task))
      pending.add(task)
      maxInFlight = Math.max(maxInFlight, pending.size)
    }
    await Promise.all(pending)
    const elapsedSeconds = (performance.now() - start) / 1000
    // Persist request evidence even if monitoring itself stops responding.
    let after = null
    try { after = await metrics() } catch (error) {
      stage.monitoringError = error.message
      stop('Resource monitoring unavailable after stage')
    }
    const failures = observations.filter(result => !result.ok)
    const p95Ms = percentile(observations.map(result => result.ms), 0.95)
    const resources = after ? resourceDelta(before, after) : null
    const passed = !stopped && observations.length === planned && failures.length === 0 && p95Ms <= CONFIG.p95LimitMs && resources?.memoryAvailableMB >= CONFIG.minAvailableMemoryMB
    Object.assign(stage, { planned, completed: observations.length, elapsedSeconds: Math.round(elapsedSeconds * 10) / 10, failures: failures.length, p50Ms: percentile(observations.map(result => result.ms), 0.5), p95Ms, maxMs: observations.length ? Math.round(Math.max(...observations.map(result => result.ms))) : null, maxInFlight, passed, resources, byWorkload: workloads.map(work => { const subset = observations.filter(result => result.name === work.name); return { name: work.name, requests: subset.length, failures: subset.filter(result => !result.ok).length, p95Ms: percentile(subset.map(result => result.ms), 0.95) } }), errors: failures.map(result => ({name:result.name,error:result.error})) })
    console.log(JSON.stringify(stage))
    if (!passed) { stop(stopped || 'Stage exceeded p95 or memory threshold'); break }
    await sleep(5000)
  }
} catch (error) {
  stop(error.message)
} finally {
  report.stopped = stopped
  report.maximumPassedReadSessions = Math.max(0, ...report.stages.filter(stage => stage.passed).map(stage => stage.sessions))
  report.finishedAt = new Date().toISOString()
  await writeFile('output/capacity/readonly-result.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ maximumPassedReadSessions: report.maximumPassedReadSessions, fullBusinessCapacityEstablished: false, stopped }))
  if (stopped) process.exitCode = 1
}
