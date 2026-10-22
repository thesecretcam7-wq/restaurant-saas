export function getPOSProductLayout(width: number, height: number, compact = true) {
  const gap = compact ? 8 : 12
  const minWidth = compact ? 150 : 165
  const columns = Math.max(1, Math.floor((Math.max(0, width) + gap) / (minWidth + gap)))
  const columnWidth = Math.max(0, (width - gap * (columns - 1)) / columns)
  const targetHeight = Math.min(160, Math.max(112, columnWidth * 0.82))
  const maxRows = Math.max(1, Math.floor((Math.max(0, height) + gap) / (112 + gap)))
  const rows = Math.max(1, Math.min(maxRows, Math.round((height + gap) / (targetHeight + gap))))
  const rowHeight = Math.max(112, (height - gap * (rows - 1)) / rows)
  return { columns, rows, rowHeight, gap }
}
