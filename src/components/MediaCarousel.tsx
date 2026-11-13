import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
interface Props {
  title: string
  count: number
  children: ReactNode
  onShowAll?: () => void
}

export function MediaCarousel({ title, count, children, onShowAll }: Props) {
  const cards = Children.toArray(children)
  const trackRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollButtons = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const maxScroll = track.scrollWidth - track.clientWidth
    setCanScrollLeft(track.scrollLeft > 0)
    setCanScrollRight(track.scrollLeft < maxScroll - 1)
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    updateScrollButtons()
    const observer = new ResizeObserver(updateScrollButtons)
    observer.observe(track)
    return () => observer.disconnect()
  }, [cards.length, updateScrollButtons])

  const scroll = (direction: -1 | 1) => {
    const track = trackRef.current
    if (!track) return
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <section className="library-carousel-section" aria-label={title}>
      <div className="library-carousel-heading">
        <h2>{title}</h2>
        <span className="muted">{count}</span>
        {onShowAll && (
          <button type="button" className="library-show-all" onClick={onShowAll}>
            Mostrar todo <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
      <div className="library-carousel">
        <button
          type="button"
          className="library-carousel-arrow library-carousel-arrow-left"
          aria-label={`Desplazar ${title} hacia la izquierda`}
          onClick={() => scroll(-1)}
          title="Desplazar hacia la izquierda"
          disabled={!canScrollLeft}
        >
          ‹
        </button>
        <div ref={trackRef} className="library-carousel-track" onScroll={updateScrollButtons}>
          {cards}
        </div>
        <button
          type="button"
          className="library-carousel-arrow library-carousel-arrow-right"
          aria-label={`Desplazar ${title} hacia la derecha`}
          onClick={() => scroll(1)}
          title="Desplazar hacia la derecha"
          disabled={!canScrollRight}
        >
          ›
        </button>
      </div>
    </section>
  )
}
