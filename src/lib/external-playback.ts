import { resolveServerUrl } from './api'

export function downloadM3uPlaylist(src: string, title: string): void {
  const safeTitle = title.replace(/[\r\n]/g, ' ')
  const filename = safeTitle.replace(/[\\/:*?"<>|]/g, '_') || 'streamapp'
  const playlist = `#EXTM3U\n#EXTINF:-1,${safeTitle}\n${resolveServerUrl(src)}\n`
  const url = URL.createObjectURL(new Blob([playlist], { type: 'audio/x-mpegurl' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.m3u`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function launchVlc(src: string, title: string): void {
  const handler = new URL('streamapp-player://play')
  handler.searchParams.set('url', resolveServerUrl(src))
  handler.searchParams.set('title', title)
  window.location.assign(handler.toString())
}