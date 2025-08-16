/* =============================
   src/components/SpinWheel.jsx
============================= */
import { useEffect, useMemo, useRef, useState } from 'react'

function d2r(d){return (d*Math.PI)/180}
function polar(cx, cy, r, angle){
  const a = d2r(angle)
  return { x: cx + r*Math.sin(a), y: cy - r*Math.cos(a) } // 0° at top
}

function sectorPath(cx, cy, r, a0, a1){
  const p0 = polar(cx, cy, r, a0)
  const p1 = polar(cx, cy, r, a1)
  const large = (a1 - a0) % 360 > 180 ? 1 : 0
  // sector from center
  return `M ${cx} ${cy} L ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y} Z`
}

const COLORS = ['#f43f5e','#ef4444','#f59e0b','#22c55e','#14b8a6','#3b82f6','#a855f7','#f97316','#10b981','#0ea5e9','#eab308','#84cc16']
const POINTER_ANGLE = 90 // 0=top, 90=right, 180=bottom, 270=left

/**
 * SpinWheel component
 * props:
 *  entries: [{ label: string, image?: string (url), color?: string }]
 *  onWin: (winner, index) => void
 *  removeAfterSpin?: boolean
 *  targetIndex?: number | null  (deterministic spin)
 *  duration?: number (ms)
 */
export default function SpinWheel({
  entries = [],
  onWin = () => {},
  removeAfterSpin = false,
  targetIndex = null,
  duration = 4500,
}){
  const [rotation, setRotation] = useState(0) // total degrees
  const [spinning, setSpinning] = useState(false)
  const rotationRef = useRef(0)
  useEffect(()=>{ rotationRef.current = rotation }, [rotation])
  const lastTargetRef = useRef(null)
  const wheelRef = useRef(null)
  const audioRef = useRef(null)

  const N = entries.length
  const piece = N > 0 ? 360/N : 0

  // Tick sound via Web Audio (lightweight click)
  const audioCtxRef = useRef(null)
  const tickTimerRef = useRef(null)

  useEffect(()=>()=>{ // cleanup audio
    clearInterval(tickTimerRef.current)
    if(audioCtxRef.current){ audioCtxRef.current.close().catch(()=>{}) }
  },[])

  const startTicks = () => {
    if(!audioCtxRef.current){
      try{ audioCtxRef.current = new (window.AudioContext||window.webkitAudioContext)() }catch{}
    }
    clearInterval(tickTimerRef.current)
    // tick roughly each slice pass; frequency increases at start then slows — simple emulation
    let interval = 80
    tickTimerRef.current = setInterval(()=>{
      if(!audioCtxRef.current) return
      const ctx = audioCtxRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = 900
      gain.gain.value = 0.06
      osc.connect(gain).connect(ctx.destination)
      osc.start()
      setTimeout(()=>{ osc.stop() }, 20)
      interval = Math.min(180, interval + 4) // slowly lengthen (slowing wheel)
    }, interval)
  }

  const stopTicks = () => { clearInterval(tickTimerRef.current) }

  const chime = () => {
    if(!audioCtxRef.current){
      try{ audioCtxRef.current = new (window.AudioContext||window.webkitAudioContext)() }catch{}
    }
    const ctx = audioCtxRef.current
    if(!ctx) return
    const now = ctx.currentTime
    const o1 = ctx.createOscillator(); const g1 = ctx.createGain()
    o1.frequency.setValueAtTime(660, now)
    g1.gain.setValueAtTime(0.0001, now)
    g1.gain.exponentialRampToValueAtTime(0.15, now+0.01)
    g1.gain.exponentialRampToValueAtTime(0.0001, now+0.4)
    o1.connect(g1).connect(ctx.destination)
    o1.start(now); o1.stop(now+0.4)
  }

  const spin = () => {
    if (spinning || N === 0) return
    setSpinning(true)

    // choose winner index
    let idx
    if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex < N) {
      idx = targetIndex
    } else {
      idx = Math.floor(Math.random() * N)
    }
    lastTargetRef.current = idx

    // compute delta so the chosen slice's midpoint lands at the pointer angle
    const current = ((rotationRef.current % 360) + 360) % 360
    const mid = idx * piece + piece / 2
    const needed = (POINTER_ANGLE - mid + 360) % 360
    const deltaToTarget = (needed - current + 360) % 360
    const spins = 6
    const delta = spins * 360 + deltaToTarget

    startTicks()
    setRotation(prev => prev + delta)

    setTimeout(() => {
      stopTicks();
      chime();
      setSpinning(false)
      onWin(entries[idx], idx)
    }, duration)
  }

  // Compute current winner from rotation (for pointer) — useful if you want live display
  const winnerIndex = useMemo(()=>{
    if (N===0) return -1
    const rot = ((rotation % 360) + 360) % 360
    const a = (POINTER_ANGLE - rot + 360) % 360
    const idx = Math.floor(a / piece) % N
    return idx
  }, [rotation, piece, N])

  const size = 420
  const r = size/2 - 8
  const cx = size/2
  const cy = size/2

  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative" style={{width:size, height:size}}>
        {/* pointer */}
        <div className="absolute top-1/2 -translate-y-1/2 -right-3 z-20">
          <div className="w-0 h-0 border-t-[14px] border-b-[14px] border-l-[22px] border-t-transparent border-b-transparent border-l-amber-400 drop-shadow" />
        </div>

        <svg width={size} height={size} className="block drop-shadow" ref={wheelRef}
             style={{ transformOrigin: "50% 50%", transition: spinning ? `transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)` : "none", transform: `rotate(${rotation}deg)` }}>
          {/* base */}
          <defs>
            <radialGradient id="ring" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="70%" stopColor="#f3f4f6" />
              <stop offset="100%" stopColor="#e5e7eb" />
            </radialGradient>
            <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#111827"/>
              <stop offset="100%" stopColor="#374151"/>
            </linearGradient>
          </defs>
          <circle cx={cx} cy={cy} r={r} fill="url(#edge)" />
          <circle cx={cx} cy={cy} r={r-6} fill="url(#ring)" />
          <circle cx={cx} cy={cy} r={r-6} fill="none" stroke="#e5e7eb" strokeWidth="2" />

          {/* slices */}
          {entries.map((e, i)=>{
            const a0 = i*piece
            const a1 = (i+1)*piece
            const mid = a0 + piece/2
            const id = `clip-${i}`
            const color = e.color || COLORS[i % COLORS.length]
            return (
              <g key={i}>
                <path d={sectorPath(cx, cy, r-10, a0, a1)} fill={color} stroke="#fff" strokeWidth="2" />
                {/* image clipped into sector */}
                {e.image && (
                  <>
                    <clipPath id={id}>
                      <path d={sectorPath(cx, cy, r-16, a0, a1)} />
                    </clipPath>
                    <image href={e.image} x={cx-(r-16)} y={cy-(r-16)} width={(r-16)*2} height={(r-16)*2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id})`} opacity="0.9" />
                  </>
                )}
                {/* label */}
                <g transform={`rotate(${mid} ${cx} ${cy})`}>
                  <text x={cx} y={cy-(r*0.62)} textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="600" fill="#111827" style={{userSelect:'none'}}>{e.label}</text>
                </g>
              </g>
            )
          })}

          {/* center cap */}
          <circle cx={cx} cy={cy} r={46} fill="#111827" opacity="0.1" />
          <circle cx={cx} cy={cy} r={40} fill="#111827" />
          <circle cx={cx} cy={cy} r={36} fill="#1f2937" />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontWeight="700" fontSize="14" fill="#ffffff">SPIN</text>
        </svg>

        {/* overlay for accessibility when spinning */}
        {spinning && <div className="absolute inset-0" aria-hidden="true" />}
      </div>

      <div className="mt-4 flex gap-3">
        <button onClick={spin} disabled={spinning || N===0} className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 font-medium shadow-soft hover:brightness-110 disabled:opacity-40">{spinning? 'Spinning…':'Spin'}</button>
      </div>
    </div>
  )}

