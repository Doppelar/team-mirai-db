import { getYouTubeEmbedUrl } from '../lib/youtube'

interface YouTubeEmbedProps {
  url: string
  title?: string
}

export default function YouTubeEmbed({ url, title = 'YouTube動画' }: YouTubeEmbedProps) {
  const embedUrl = getYouTubeEmbedUrl(url)
  if (!embedUrl) return null

  return (
    <div className="aspect-video w-full rounded-xl overflow-hidden shadow-md bg-black">
      <iframe
        src={embedUrl}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  )
}
