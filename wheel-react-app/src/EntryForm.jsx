/* =============================
   src/components/EntryForm.jsx
============================= */
import { useRef, useState } from 'react'

export function EntryForm({ onAdd }){
  const [label, setLabel] = useState('')
  const [image, setImage] = useState(null)
  const fileRef = useRef()

  const submit = (e) => {
    e.preventDefault()
    if(!label.trim()) return
    onAdd({ label: label.trim(), image })
    setLabel(''); setImage(null)
    if(fileRef.current) fileRef.current.value = ''
  }

  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
      <input value={label} onChange={(e)=>setLabel(e.target.value)} placeholder="Slice label" className="flex-1 rounded-xl border px-3 py-2"/>
      <input ref={fileRef} type="file" accept="image/*" onChange={(e)=>{
        const f = e.target.files?.[0]
        if(f) setImage(URL.createObjectURL(f))
      }} className="rounded-xl border px-3 py-2"/>
      <button className="rounded-xl bg-gray-900 text-white px-4 py-2">Add</button>
    </form>
  )
}