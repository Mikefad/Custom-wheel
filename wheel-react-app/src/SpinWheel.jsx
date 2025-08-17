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
  return `M ${cx} ${cy} L ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y} Z`
}

const COLORS = ['#f43f5e','#ef4444','#f59e0b','#22c55e','#14b8a6','#3b82f6','#a855f7','#f97316','#10b981','#0ea5e9','#eab308','#84cc16']
const POINTER_ANGLE = 90 // 0=top, 90=right, 180=bottom, 270=left

export default function SpinWheel({
  entries = [],
  onWin = () => {},
  removeAfterSpin = false,
  targetIndex = null,
  duration = 4500,
}){
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const rotationRef = useRef(0)
  useEffect(()=>{ rotationRef.current = rotation }, [rotation])

  const N = entries.length
  const piece = N > 0 ? 360/N : 0

  // audio
  const audioCtxRef = useRef(null)
  const tickTimerRef = useRef(null)
  useEffect(()=>()=>{ clearInterval(tickTimerRef.current); if(audioCtxRef.current){ audioCtxRef.current.close().catch(()=>{}) } },[])
  const startTicks = () => {
    if(!audioCtxRef.current){ try{ audioCtxRef.current = new (window.AudioContext||window.webkitAudioContext)() }catch{} }
    clearInterval(tickTimerRef.current)
    let interval = 80
    tickTimerRef.current = setInterval(()=>{
      if(!audioCtxRef.current) return
      const ctx = audioCtxRef.current
      const osc = ctx.createOscillator(), gain = ctx.createGain()
      osc.frequency.value = 900; gain.gain.value = 0.06
      osc.connect(gain).connect(ctx.destination); osc.start(); setTimeout(()=>osc.stop(), 20)
      interval = Math.min(180, interval + 4)
    }, interval)
  }
  const stopTicks = () => clearInterval(tickTimerRef.current)
  const chime = () => {
    if(!audioCtxRef.current){ try{ audioCtxRef.current = new (window.AudioContext||window.webkitAudioContext)() }catch{} }
    const ctx = audioCtxRef.current; if(!ctx) return
    const now = ctx.currentTime
    const o1 = ctx.createOscillator(), g1 = ctx.createGain()
    o1.frequency.setValueAtTime(660, now)
    g1.gain.setValueAtTime(0.0001, now)
    g1.gain.exponentialRampToValueAtTime(0.15, now+0.01)
    g1.gain.exponentialRampToValueAtTime(0.0001, now+0.4)
    o1.connect(g1).connect(ctx.destination); o1.start(now); o1.stop(now+0.4)
  }

  const spin = () => {
    if (spinning || N === 0) return
    setSpinning(true)
    const idx = (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex < N)
      ? targetIndex
      : Math.floor(Math.random() * N)
    const current = ((rotationRef.current % 360) + 360) % 360
    const mid = idx * piece + piece / 2
    const needed = (POINTER_ANGLE - mid + 360) % 360
    const deltaToTarget = (needed - current + 360) % 360
    const spins = 6
    const delta = spins * 360 + deltaToTarget
    startTicks()
    setRotation(prev => prev + delta)
    setTimeout(() => { stopTicks(); chime(); setSpinning(false); onWin(entries[idx], idx) }, duration)
  }

  const winnerIndex = useMemo(()=>{
    if (N===0) return -1
    const rot = ((rotation % 360) + 360) % 360
    const a = (POINTER_ANGLE - rot + 360) % 360
    return Math.floor(a / piece) % N
  }, [rotation, piece, N])

  // Responsive geometry via viewBox
  const S = 420
  const r = S/2 - 8
  const cx = S/2
  const cy = S/2

  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative w-full max-w-[420px] aspect-square overflow-hidden">
        {/* pointer (right side, pointing left) */}
        <div className="absolute top-1/2 -translate-y-1/2 right-1 z-20 pointer-events-none">
          <div className="w-0 h-0 border-t-[14px] border-b-[14px] border-r-[22px]
                          border-t-transparent border-b-transparent border-r-amber-400 drop-shadow" />
        </div>

        <svg
          viewBox={`0 0 ${S} ${S}`}
          className="block drop-shadow w-full h-full"
          style={{ transformOrigin: '50% 50%', transition: spinning ? `transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)` : 'none', transform: `rotate(${rotation}deg)` }}
        >
          <defs>
            <radialGradient id="ring" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="70%" stopColor="#f3f4f6" />
              <stop offset="100%" stopColor="#e5e7eb" />
            </radialGradient>
            <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#111827"/><stop offset="100%" stopColor="#374151"/>
            </linearGradient>
          </defs>

          <circle cx={cx} cy={cy} r={r} fill="url(#edge)" />
          <circle cx={cx} cy={cy} r={r-6} fill="url(#ring)" />
          <circle cx={cx} cy={cy} r={r-6} fill="none" stroke="#e5e7eb" strokeWidth="2" />

          {entries.map((e, i)=>{
            const a0 = i*piece, a1 = (i+1)*piece, mid = a0 + piece/2
            const id = `clip-${i}`, color = e.color || COLORS[i % COLORS.length]
            return (
              <g key={i}>
                <path d={sectorPath(cx, cy, r-10, a0, a1)} fill={color} stroke="#fff" strokeWidth="2" />
                {e.image && (
                  <>
                    <clipPath id={id}><path d={sectorPath(cx, cy, r-16, a0, a1)} /></clipPath>
                    <image href={e.image} x={cx-(r-16)} y={cy-(r-16)} width={(r-16)*2} height={(r-16)*2}
                           preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id})`} opacity="0.9" />
                  </>
                )}
                <g transform={`rotate(${mid} ${cx} ${cy})`}>
                  <text x={cx} y={cy-(r*0.62)} textAnchor="middle" dominantBaseline="middle"
                        fontSize="14" fontWeight="600" fill="#111827" style={{userSelect:'none'}}>
                    {e.label}
                  </text>
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

        {spinning && <div className="absolute inset-0" aria-hidden="true" />}
      </div>

      <div className="mt-4 flex gap-3">
        <button onClick={spin} disabled={spinning || N===0}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 font-medium shadow-soft hover:brightness-110 disabled:opacity-40">
          {spinning? 'Spinning…':'Spin'}
        </button>
      </div>
    </div>
  )
}


