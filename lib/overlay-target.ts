// The POS requests fullscreen on the document, so overlays keep the same body
// parent and styling in both modes. Preserve compatibility with other screens.
export function getOverlayTarget(): Element | null {
  if (typeof document === 'undefined') return null
  return document.fullscreenElement && document.fullscreenElement !== document.documentElement
    ? document.fullscreenElement
    : document.body
}
