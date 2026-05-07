const baseUrl = (process.env.ECCOFOOD_URL || 'http://localhost:3000').replace(/\/$/, '')
const tenant = process.env.ECCOFOOD_TENANT || 'elbuenpaladar'

const paths = [
  '/',
  '/planes',
  `/${tenant}`,
  `/${tenant}/menu`,
  `/${tenant}/carta`,
  `/${tenant}/acceso`,
  `/${tenant}/admin/login`,
]

async function check(path) {
  const url = `${baseUrl}${path}`
  const startedAt = Date.now()
  try {
    const response = await fetch(url, {
      redirect: 'manual',
      headers: { 'user-agent': 'EccofoodSmokeTest/1.0' },
    })
    return {
      path,
      ok: response.status < 500,
      status: response.status,
      ms: Date.now() - startedAt,
    }
  } catch (error) {
    return {
      path,
      ok: false,
      status: 'ERROR',
      ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

const results = await Promise.all(paths.map(check))
const failed = results.filter((result) => !result.ok)

console.log(`Eccofood smoke test: ${baseUrl}`)
for (const result of results) {
  const icon = result.ok ? 'OK ' : 'FAIL'
  console.log(`${icon} ${String(result.status).padEnd(5)} ${String(result.ms).padStart(5)}ms ${result.path}${result.error ? ` - ${result.error}` : ''}`)
}

if (failed.length > 0) {
  process.exitCode = 1
}
