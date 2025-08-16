/* =============================
   src/App.jsx  (demo page)
============================= */
import { useEffect, useMemo, useState } from 'react'
import SpinWheel from './SpinWheel'
import { EntryForm } from './EntryForm'

const DEFAULTS = [
  { label: 'Ali' },
  { label: 'Beatriz' },
  { label: 'Charles' },
  { label: 'Diya' },
  { label: 'Eric' },
  { label: 'Fatima' },
  { label: 'Gabriel' },
  { label: 'Hanna' },
]

const DEMOS = {
  Classroom: ['Ali','Beatriz','Charles','Diya','Eric','Fatima','Gabriel','Hanna'],
  Giveaway: ['iPad','AirPods','Gift Card','T-shirt','Hoodie','Sticker Pack','Mug','Mystery'],
  Teams: ['Frontend','Backend','Design','QA','Ops','Data','Mobile','PM']
}

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '1234'

export default function App(){
  const [entries, setEntries] = useState(()=>{
    const raw = localStorage.getItem('wheel:entries')
    return raw ? JSON.parse(raw) : DEFAULTS
  })
  const [removeAfter, setRemoveAfter] = useState(()=>{
    const raw = localStorage.getItem('wheel:removeAfter')
    return raw ? JSON.parse(raw) : true
  })
  const [presetIndex, setPresetIndex] = useState('')
  const [lastWinner, setLastWinner] = useState(null)

  // Spin log + stats
  const [spinLog, setSpinLog] = useState(()=>{
    const raw = localStorage.getItem('wheel:log')
    return raw ? JSON.parse(raw) : []
  })
  useEffect(()=>{ localStorage.setItem('wheel:log', JSON.stringify(spinLog)) }, [spinLog])

  const totalSpins = spinLog.length
  const leaderboard = useMemo(()=>{
    const counts = new Map()
    for(const s of spinLog){ counts.set(s.label, (counts.get(s.label)||0)+1) }
    return [...counts.entries()].sort((a,b)=>b[1]-a[1])
  }, [spinLog])

  const [isAdmin, setIsAdmin] = useState(()=> localStorage.getItem('wheel:isAdmin') === '1')
  const [showLogin, setShowLogin] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinErr, setPinErr] = useState('')

  // persist
  useEffect(()=>{ localStorage.setItem('wheel:entries', JSON.stringify(entries)) }, [entries])
  useEffect(()=>{ localStorage.setItem('wheel:removeAfter', JSON.stringify(removeAfter)) }, [removeAfter])

  const onAdd = (e) => setEntries(prev => [...prev, e])
  const onRemoveAt = (i) => setEntries(prev => prev.filter((_,idx)=> idx!==i))

  const doWin = (winner, index) => {
    setLastWinner({ winner, index })
    setSpinLog(prev => [{ time: new Date().toISOString(), label: winner?.label || '' }, ...prev].slice(0,200))
    if(removeAfter){
      setEntries(prev => prev.filter((_,i)=> i!==index))
      setPresetIndex('')
    }
  }

  const effectiveRemoveAfter = isAdmin ? removeAfter : true
  const targetIndex = isAdmin && presetIndex !== '' ? Number(presetIndex) : null

  const tryLogin = (e) => {
    e?.preventDefault?.()
    if(pinInput === ADMIN_PIN){
      setIsAdmin(true)
      localStorage.setItem('wheel:isAdmin','1')
      setShowLogin(false); setPinInput(''); setPinErr('')
    } else {
      setPinErr('Wrong PIN')
    }
  }

  const logout = () => { setIsAdmin(false); localStorage.removeItem('wheel:isAdmin') }

  const exportCSV = () => {
    const rows = [['time','label'], ...spinLog.map(s=>[s.time, s.label])]
    const csv = rows.map(r=> r.map(x=>`"${String(x).replaceAll('"','""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'spin-results.csv'; a.click(); URL.revokeObjectURL(url)
  }

  const loadDemo = (key) => {
    if(!isAdmin) return
    const list = DEMOS[key] || []
    setEntries(list.map(label => ({ label })))
    setPresetIndex('')
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-600 via-sky-500 to-fuchsia-500 opacity-20"/>
        <div className="absolute inset-0 -z-10" style={{backgroundImage:'radial-gradient(50% 50% at 50% 0%, rgba(99,102,241,0.20) 0%, rgba(99,102,241,0) 60%)'}}/>
        <div className="sticky top-0 z-40 bg-white/70 backdrop-blur border-b">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="font-semibold tracking-tight">Prize Wheel Pro</div>
            <div className="flex items-center gap-3">
              {!isAdmin ? (
                <button onClick={()=>setShowLogin(v=>!v)} className="text-sm rounded-lg border px-3 py-1.5 hover:bg-gray-50">Admin</button>
              ) : (
                <button onClick={logout} className="text-sm rounded-lg border px-3 py-1.5 hover:bg-gray-50">Logout</button>
              )}
            </div>
          </div>
          {showLogin && !isAdmin && (
            <div className="border-t bg-white/80">
              <form onSubmit={tryLogin} className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2">
                <input value={pinInput} onChange={(e)=>setPinInput(e.target.value)} placeholder="Enter admin PIN" className="rounded-xl border px-3 py-2"/>
                <button className="rounded-xl bg-gray-900 text-white px-4 py-2">Unlock</button>
                {pinErr && <span className="text-sm text-red-600">{pinErr}</span>}
                <span className="ml-auto text-xs text-gray-500">Set via VITE_ADMIN_PIN</span>
              </form>
            </div>
          )}
        </div>

        {/* Hero */}
        <section className="border-b bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-6xl mx-auto px-4 py-10 md:py-14 grid md:grid-cols-[1.2fr,1fr] gap-8 items-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Spin. Reveal. Celebrate.</h1>
              <p className="mt-3 text-gray-600">A clean, controllable wheel for giveaways, classrooms, and standups. Admin-only controls, deterministic outcomes, and polished visuals.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-white border px-3 py-1 text-xs shadow-soft">🎯 Deterministic</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white border px-3 py-1 text-xs shadow-soft">🖼️ Image slices</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white border px-3 py-1 text-xs shadow-soft">🔊 Sound</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white border px-3 py-1 text-xs shadow-soft">🗑️ Auto‑remove winners</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl border bg-white p-4 shadow-soft">
                <div className="text-xs text-gray-500">Entries</div>
                <div className="text-2xl font-semibold">{entries.length}</div>
              </div>
              <div className="rounded-2xl border bg-white p-4 shadow-soft">
                <div className="text-xs text-gray-500">Total spins</div>
                <div className="text-2xl font-semibold">{totalSpins}</div>
              </div>
              <div className="rounded-2xl border bg-white p-4 shadow-soft">
                <div className="text-xs text-gray-500">Last winner</div>
                <div className="text-sm font-medium truncate">{lastWinner?.winner?.label || '—'}</div>
              </div>
            </div>
          </div>
        </section>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10 grid lg:grid-cols-[1.2fr,0.8fr] gap-8">
        <div className="flex flex-col items-center">
          <SpinWheel
            entries={entries}
            onWin={doWin}
            removeAfterSpin={effectiveRemoveAfter}
            targetIndex={targetIndex}
            duration={4800}
          />

          {lastWinner && (
            <div className="mt-6 rounded-2xl border p-4 bg-emerald-50 border-emerald-200 text-emerald-800 w-full max-w-xl text-center">
              Winner: <span className="font-semibold">{lastWinner.winner?.label}</span>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          {/* Results & Stats */}
          <div className="rounded-2xl border p-4 bg-white">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Results & Stats</h3>
              <div className="flex gap-2">
                <button onClick={exportCSV} className="text-xs rounded-lg border px-2 py-1 hover:bg-gray-50">Export CSV</button>
                <button onClick={()=>setSpinLog([])} className="text-xs rounded-lg border px-2 py-1 hover:bg-gray-50">Clear</button>
              </div>
            </div>
            <div className="mt-3 grid sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">Recent spins</div>
                <ul className="text-sm max-h-40 overflow-auto divide-y">
                  {spinLog.slice(0,8).map((s,i)=> (
                    <li key={i} className="py-1.5 flex items-center justify-between gap-3"><span className="font-medium">{s.label}</span><span className="text-xs text-gray-500">{new Date(s.time).toLocaleTimeString()}</span></li>
                  ))}
                  {spinLog.length===0 && <li className="py-3 text-gray-500">No spins yet.</li>}
                </ul>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Leaderboard</div>
                <ul className="text-sm max-h-40 overflow-auto divide-y">
                  {leaderboard.slice(0,8).map(([name,count],i)=> (
                    <li key={i} className="py-1.5 flex items-center justify-between gap-3"><span className="font-medium">{name}</span><span className="text-xs text-gray-500">×{count}</span></li>
                  ))}
                  {leaderboard.length===0 && <li className="py-3 text-gray-500">No winners recorded.</li>}
                </ul>
              </div>
            </div>
          </div>

          {/* Admin or viewer controls */}
          {isAdmin ? (
            <div className="space-y-6">
              <div className="rounded-2xl border p-4 bg-white">
                <h3 className="font-medium">Entries ({entries.length})</h3>
                <div className="mt-3"><EntryForm onAdd={onAdd} /></div>
                <ul className="mt-4 divide-y max-h-48 overflow-auto">
                  {entries.map((e,i)=> (
                    <li key={i} className="flex items-center gap-3 py-2">
                      <span className="text-sm font-medium">{i+1}.</span>
                      {e.image && <img src={e.image} alt="" className="h-8 w-8 rounded object-cover"/>}
                      <span className="flex-1">{e.label}</span>
                      <button onClick={()=>onRemoveAt(i)} className="text-sm text-gray-500 hover:text-gray-900">Remove</button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border p-4 bg-white">
                <h3 className="font-medium">Spin options</h3>
                <div className="mt-3 space-y-3 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={removeAfter} onChange={(e)=>setRemoveAfter(e.target.checked)} />
                    Remove winning slice after spin
                  </label>
                  <div>
                    <label className="block text-gray-600">Preset outcome (index)</label>
                    <input value={presetIndex} onChange={(e)=> setPresetIndex(e.target.value)} placeholder="leave blank for random" className="mt-1 w-full rounded-xl border px-3 py-2"/>
                    <p className="mt-1 text-xs text-gray-500">Use numbers 0..{Math.max(0, entries.length-1)}. Example: 0 makes the first entry win.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border p-4 bg-white">
                <h3 className="font-medium">Demo wheels</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.keys(DEMOS).map(k=> (
                    <button key={k} onClick={()=>loadDemo(k)} className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50">{k}</button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border p-4 bg-white text-sm text-gray-600">
              <h3 className="font-medium text-gray-900">Viewer mode</h3>
              <p className="mt-2">Only admins can modify entries or force outcomes. Click <em>Admin</em> in the header to unlock.</p>
              <p className="mt-2">Winning slices are automatically removed after each spin.</p>
            </div>
          )}

          {/* How it works */}
          <div className="rounded-2xl border p-4 bg-white text-sm text-gray-600">
            <h3 className="font-medium text-gray-900">How it works</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>The arrow on the <strong>right</strong> is the pointer. The slice under it is the winner.</li>
              <li>Admins can preselect a winner (deterministic spin) by index.</li>
              <li>Use Export to download a CSV of results.</li>
            </ul>
          </div>
        </aside>
      </main>

      <footer className="border-t bg-white">
        <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-gray-600 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Prize Wheel Pro</p>
          <div className="flex gap-4">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Support</span>
          </div>
        </div>
      </footer>
    </div>
  )
}


