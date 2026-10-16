interface ProgresoProps {
  value: number
  label?: string
}

export function Progreso({ value, label }: ProgresoProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)))
  return (
    <div className="reading-progress">
      <div
        className="reading-progress-track"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${clamped}%` }} />
      </div>
      <span className="reading-progress-label">{label ?? `${clamped}%`}</span>
    </div>
  )
}
