export function salesInPeriod<T extends { created_at?: string | null }>(sales: T[], start: string, end?: string) {
  const startTime = Date.parse(start)
  const endTime = end ? Date.parse(end) : Infinity
  return sales.filter((sale) => {
    const createdAt = sale.created_at ? Date.parse(sale.created_at) : NaN
    return createdAt >= startTime && createdAt < endTime
  })
}
