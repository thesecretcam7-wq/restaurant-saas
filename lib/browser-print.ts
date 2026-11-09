import { getOverlayTarget } from './overlay-target'

// Print in this document instead of opening another window and leaving the POS.
export function printBrowserDocument(html: string, title: string) {
  const iframe = document.createElement('iframe')
  iframe.title = title
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  const target = getOverlayTarget()
  if (!target) throw new Error('No se pudo preparar la impresión')
  target.appendChild(iframe)
  const frame = iframe.contentWindow
  const doc = iframe.contentDocument || frame?.document
  if (!frame || !doc) { iframe.remove(); throw new Error('No se pudo preparar la impresión') }
  // Some browsers never emit afterprint when the dialog is cancelled.
  const cleanupTimeout = setTimeout(() => iframe.remove(), 120000)
  frame.addEventListener('afterprint', () => {
    clearTimeout(cleanupTimeout)
    setTimeout(() => iframe.remove(), 1000)
  }, { once: true })
  doc.open()
  doc.write(html)
  doc.close()
  doc.title = title
  setTimeout(() => { frame.focus(); frame.print() }, 250)
}
