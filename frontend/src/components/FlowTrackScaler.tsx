import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import './FlowTrackScaler.css'

interface FlowTrackScalerProps {
  children: ReactNode
  measureKey: string | number
}

interface Layout {
  scale: number
  naturalW: number
  naturalH: number
}

export function FlowTrackScaler({ children, measureKey }: FlowTrackScalerProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<Layout>({ scale: 1, naturalW: 0, naturalH: 0 })

  useLayoutEffect(() => {
    const measure = () => {
      const viewport = viewportRef.current
      const content = contentRef.current
      if (!viewport || !content) return

      // Measure at scale 1 so scrollWidth reflects the true chain width
      const prevTransform = content.style.transform
      const prevWidth = content.style.width
      content.style.transform = 'none'
      content.style.width = 'auto'

      const naturalW = content.scrollWidth
      const naturalH = content.scrollHeight
      const available = viewport.clientWidth
      const scale = naturalW > 0 ? Math.min(1, available / naturalW) : 1

      content.style.transform = prevTransform
      content.style.width = prevWidth

      setLayout({ scale, naturalW, naturalH })
    }

    measure()
    const observer = new ResizeObserver(() => requestAnimationFrame(measure))
    if (viewportRef.current) observer.observe(viewportRef.current)
    if (contentRef.current) observer.observe(contentRef.current)
    return () => observer.disconnect()
  }, [measureKey])

  const scaled = layout.scale < 1 && layout.naturalW > 0

  return (
    <div ref={viewportRef} className="flow-track-viewport">
      <div
        className="flow-track-clip"
        style={
          scaled
            ? {
                width: layout.naturalW * layout.scale,
                height: layout.naturalH * layout.scale,
              }
            : undefined
        }
      >
        <div
          ref={contentRef}
          className="flow-track-content"
          style={
            scaled
              ? {
                  width: layout.naturalW,
                  transform: `scale(${layout.scale})`,
                }
              : undefined
          }
        >
          {children}
        </div>
      </div>
    </div>
  )
}
