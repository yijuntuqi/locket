import { toPng } from 'html-to-image'

export async function exportNodeToPng(
  node: HTMLElement,
  filename: string
): Promise<void> {
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    backgroundColor: '#0b0b10',
    cacheBust: true,
  })
  const anchor = document.createElement('a')
  anchor.href = dataUrl
  anchor.download = filename
  anchor.click()
}
