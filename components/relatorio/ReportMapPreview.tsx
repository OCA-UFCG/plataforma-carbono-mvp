'use client'

export interface ReportMapPreviewProps {
  layerId:   string
  bbox:      [number, number, number, number]
  year:      string | null
  active:    boolean
  imageSrc?: string
  onCapture: (src: string | null) => void
}

export default function ReportMapPreview({ imageSrc }: ReportMapPreviewProps) {
  return (
    <div className="report-map-frame" style={{ height: 230 }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- imageSrc is a captured data: URI, not an optimizable asset */}
      {imageSrc && <img src={imageSrc} alt="" />}
    </div>
  )
}
