export interface FakePhoto {
  id: string
  src: string
  caption: string
}

function svgDataUri(index: number): string {
  const hue = (index * 47) % 360
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='320'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='hsl(${hue},70%,55%)'/>` +
    `<stop offset='1' stop-color='hsl(${(hue + 60) % 360},70%,40%)'/>` +
    `</linearGradient></defs>` +
    `<rect width='240' height='320' fill='url(#g)'/>` +
    `<text x='120' y='172' font-size='56' fill='rgba(255,255,255,0.9)' ` +
    `text-anchor='middle' font-family='sans-serif'>${index + 1}</text>` +
    `</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function makeFakePhotos(count: number): FakePhoto[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `fake-${i + 1}`,
    src: svgDataUri(i),
    caption: `照片 ${i + 1}`,
  }))
}
