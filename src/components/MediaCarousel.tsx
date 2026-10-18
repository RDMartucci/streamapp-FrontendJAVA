import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { CSSProperties } from 'react'

const CARDS_PER_PAGE = 12

interface Props {
  title: string
  count: number
  children: ReactNode
}

export function MediaCarousel({ title, count, children }: Props) {
  const cards = Children.toArray(children)
  const pageCount = Math.ceil(cards.length / CARDS_PER_PAGE)
  const trackRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 })
  const [scrollProgress, setScrollProgress] = useState(0)
  const pageStart = page * CARDS_PER_PAGE
  const pageCards = cards.slice(pageStart, pageStart + CARDS_PER_PAGE)
  const pageItems: (number | 'ellipsis')[] = pageCount <= 7
    ? Array.from({ length: pageCount }, (_, index) => index)
    : (() => {
        let start = Math.max(1, page - 1)
        let end = Math.min(pageCount - 2, page + 1)
        if (page <= 2) {
          start = 1
          end = 4
        } else if (page >= pageCount - 3) {
          start = pageCount - 5
          end = pageCount - 2
        }

        return [
          0,
          ...(start > 1 ? ['ellipsis' as const] : []),
          ...Array.from({ length: end - start + 1 }, (_, index) => start + index),
          ...(end < pageCount - 2 ? ['ellipsis' as const] : []),
          pageCount - 1,
        ]
      })()

  const updateScrollButtons = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const maxScroll = track.scrollWidth - track.clientWidth
    setCanScrollLeft(track.scrollLeft > 0)
    setCanScrollRight(track.scrollLeft < maxScroll - 1)
    setScrollProgress(maxScroll > 1 ? Math.round((track.scrollLeft / maxScroll) * 1000) / 10 : 100)
    const trackBounds = track.getBoundingClientRect()
    const visibleIndexes = Array.from(track.children)
      .map((child, index) => ({ child, index }))
      .filter(({ child }) => {
        const bounds = child.getBoundingClientRect()
        return bounds.right > trackBounds.left && bounds.left < trackBounds.right
      })
      .map(({ index }) => index)
    setVisibleRange(
      visibleIndexes.length > 0
        ? { start: pageStart + visibleIndexes[0] + 1, end: pageStart + visibleIndexes[visibleIndexes.length - 1] + 1 }
        : { start: pageStart + 1, end: Math.min(pageStart + pageCards.length, count) },
    )
  }, [count, pageCards.length, pageStart])

  useEffect(() => {
    if (page >= pageCount && pageCount > 0) setPage(pageCount - 1)
  }, [page, pageCount])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    track.scrollLeft = 0
    updateScrollButtons()
    const observer = new ResizeObserver(updateScrollButtons)
    observer.observe(track)
    return () => observer.disconnect()
  }, [page, pageCards.length, updateScrollButtons])

  const scroll = (direction: -1 | 1) => {
    const track = trackRef.current
    if (!track) return
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: 'smooth' })
  }

  const progressValue = pageCount > 1
    ? (page / (pageCount - 1)) * 100
    : scrollProgress

  return (
    <section className="library-carousel-section" aria-label={title}>
      <div className="library-carousel-heading">
        <h2>{title}</h2>
        <span className="muted">{count}</span>
        <span className="library-carousel-position" aria-live="polite">
          {visibleRange.start}–{visibleRange.end} de {count}
        </span>
        {(pageCount > 1 || canScrollLeft || canScrollRight) && (
          <input
            type="range"
            className="library-carousel-progress"
            min={0}
            max={pageCount > 1 ? pageCount - 1 : 100}
            step={pageCount > 1 ? 1 : 0.1}
            value={pageCount > 1 ? page : scrollProgress}
            style={{ '--carousel-progress': `${progressValue}%` } as CSSProperties}
            aria-label={pageCount > 1 ? `Página de ${title}` : `Desplazamiento horizontal de ${title}`}
            aria-valuetext={pageCount > 1
              ? `Página ${page + 1} de ${pageCount}, títulos ${pageStart + 1} a ${Math.min(pageStart + CARDS_PER_PAGE, count)} de ${count}`
              : `Mostrando ${visibleRange.start}–${visibleRange.end} de ${count} títulos`}
            onChange={(event) => {
              const value = Number(event.target.value)
              if (pageCount > 1) {
                setPage(value)
              } else {
                const track = trackRef.current
                if (track) track.scrollLeft = (value / 100) * (track.scrollWidth - track.clientWidth)
              }
            }}
          />
        )}
      </div>
      <div className="library-carousel">
        <button
          type="button"
          className="library-carousel-arrow library-carousel-arrow-left"
          aria-label={pageCount > 1 ? `Página anterior de ${title}` : `Desplazar ${title} hacia la izquierda`}
          onClick={() => pageCount > 1 ? setPage((current) => Math.max(0, current - 1)) : scroll(-1)}
          title={pageCount > 1 ? 'Página anterior' : 'Desplazar hacia la izquierda'}
          disabled={pageCount > 1 ? page === 0 : !canScrollLeft}
        >
          ‹
        </button>
        <div ref={trackRef} className="library-carousel-track" onScroll={updateScrollButtons}>
          {pageCards}
        </div>
        <button
          type="button"
          className="library-carousel-arrow library-carousel-arrow-right"
          aria-label={pageCount > 1 ? `Página siguiente de ${title}` : `Desplazar ${title} hacia la derecha`}
          onClick={() => pageCount > 1 ? setPage((current) => Math.min(pageCount - 1, current + 1)) : scroll(1)}
          title={pageCount > 1 ? 'Página siguiente' : 'Desplazar hacia la derecha'}
          disabled={pageCount > 1 ? page >= pageCount - 1 : !canScrollRight}
        >
          ›
        </button>
      </div>
      {pageCount > 1 && (
        <nav className="library-carousel-pagination" aria-label={`Páginas de ${title}`}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={page === 0}
          >
            Anterior
          </button>
          <div className="library-carousel-page-numbers">
            {pageItems.map((item, index) => item === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className="library-carousel-page-ellipsis" aria-hidden="true">…</span>
            ) : (
              <button
                key={item}
                type="button"
                className={`btn btn-sm ${item === page ? 'btn-primary' : 'btn-ghost'}`}
                aria-label={`Ir a la página ${item + 1} de ${pageCount}`}
                aria-current={item === page ? 'page' : undefined}
                onClick={() => setPage(item)}
              >
                {item + 1}
              </button>
            ))}
          </div>
          <span className="muted">Página {page + 1} de {pageCount}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
            disabled={page >= pageCount - 1}
          >
            Siguiente
          </button>
        </nav>
      )}
    </section>
  )
}
