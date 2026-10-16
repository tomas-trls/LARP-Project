// Profile photos (screen 16): three slots, the first one is your "Main" photo and your avatar everywhere.
//
//   Tap an empty slot   -> choose "Take photo" (a mock camera), "Choose from library" (the 6 sample photos)
//                          or "Upload from this device" (a real file picker)
//   then crop           -> drag to move, + / − or scroll to zoom, then "Use photo" (a short upload animation)
//   Tap a filled slot   -> full-screen viewer: swipe or tap the sides, "⋯" to replace, set as main or remove
//   Press and hold      -> drag onto another slot to reorder
//
// The photos are saved in profile.photos (a list of image addresses, the first is the main one).
import { useRef, useState } from 'react'
import { PHOTO_LIBRARY } from '../../data/memories.js'
import Icon from '../Icon.jsx'

export const MAX_PHOTOS = 3

// The dark full-screen panels (camera, crop, viewer) all use this frame.
function DarkPanel({ children, onPointerDown, onPointerUp }) {
  return (
    <div
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      className="fixed inset-0 z-[60] mx-auto flex w-full max-w-(--app-w) flex-col bg-[#0B0414] pt-[max(20px,env(safe-area-inset-top))] pb-[30px] text-[#FAFAFA] select-none"
      style={{ animation: 'larpIn .25s both', touchAction: 'pan-y' }}
    >
      {children}
    </div>
  )
}

// An iOS-style action sheet: a list of choices and a Cancel button, floating at the bottom.
export function ActionSheet({ options, onCancel }) {
  return (
    <div className="fixed inset-0 z-[65]">
      <div className="absolute inset-0 bg-[rgba(20,8,40,.55)]" onClick={onCancel} />
      <div className="absolute right-3 bottom-6 left-3 mx-auto flex max-w-(--app-w) flex-col gap-2" style={{ animation: 'larpIn .25s both' }}>
        <div className="overflow-hidden rounded-[20px] bg-sf text-center text-[16px] text-ink shadow-ring">
          {options.map((o, i) => (
            <button
              key={o.label}
              type="button"
              onClick={o.onClick}
              className={`flex w-full items-center justify-center gap-2.5 p-4 ${i < options.length - 1 ? 'border-b border-line' : ''} ${o.danger ? 'font-semibold text-[#E5484D]' : ''}`}
            >
              {o.icon}
              {o.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={onCancel} className="rounded-[20px] bg-sf p-4 text-center text-[16px] font-semibold text-ink shadow-ring">
          Cancel
        </button>
      </div>
    </div>
  )
}

// Choose → (camera | library | device file) → crop → upload. Calls onDone(imageAddress) at the end.
// Also used by Memories to add photos to a memory.
export function PhotoPicker({ onDone, onCancel }) {
  const [stage, setStage] = useState('source') // 'source' | 'library' | 'camera' | 'crop'
  const [pick, setPick] = useState(null) // the chosen image
  const [crop, setCrop] = useState({ x: 0, y: 0, s: 1 }) // position and zoom
  const fileInput = useRef(null)
  const dragFrom = useRef(null)

  const choose = (src) => {
    setPick(src)
    setCrop({ x: 0, y: 0, s: 1 })
    setStage('crop')
  }

  // A real file from the computer or phone, read into a "data URL" the browser can show and save.
  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => choose(reader.result)
    reader.readAsDataURL(file)
  }

  const zoom = (by) => setCrop((c) => ({ ...c, s: Math.max(1, Math.min(3, c.s + by)) }))

  if (stage === 'source')
    return (
      <>
        <ActionSheet
          onCancel={onCancel}
          options={[
            { label: 'Take photo', icon: <CameraIcon />, onClick: () => setStage('camera') },
            { label: 'Choose from library', icon: <GalleryIcon />, onClick: () => setStage('library') },
            { label: 'Upload from this device', icon: <Icon name="upload" size={20} />, onClick: () => fileInput.current?.click() },
          ]}
        />
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onFile} />
      </>
    )

  if (stage === 'library')
    return (
      <div className="fixed inset-0 z-[60] mx-auto flex w-full max-w-(--app-w) flex-col bg-bg px-4 pt-[max(20px,env(safe-area-inset-top))] pb-[30px] text-ink" style={{ animation: 'larpIn .25s both' }}>
        <div className="flex h-11 items-center justify-between">
          <button type="button" onClick={onCancel} className="text-[15px] font-semibold text-acc">
            Cancel
          </button>
          <div className="text-[15px] font-semibold">Recents</div>
          <div className="w-[50px]" />
        </div>
        <div className="mt-3.5 grid grid-cols-3 gap-1">
          {PHOTO_LIBRARY.map((src) => (
            <button key={src} type="button" onClick={() => choose(src)} aria-label="Choose this photo" className="aspect-square rounded-md active:opacity-80" style={{ background: `url(${src}) center/cover` }} />
          ))}
        </div>
        <div className="mt-3.5 text-center text-[12px] text-mute">Prototype library · 6 sample images</div>
      </div>
    )

  if (stage === 'camera')
    return (
      <DarkPanel>
        <div className="flex h-11 items-center justify-between px-4">
          <button type="button" onClick={onCancel} className="text-[15px] font-semibold">
            Cancel
          </button>
          <div className="text-[12px] text-white/60">Camera · mock</div>
          <div className="w-[50px]" />
        </div>
        <div className="relative mx-4 my-3.5 flex-1 rounded-3xl" style={{ background: 'repeating-linear-gradient(135deg,#1C0F2E 0 8px,#2A1745 8px 16px)' }}>
          <div className="absolute inset-[18%] rounded-xl border-[1.5px] border-white/40" />
        </div>
        <div className="flex justify-center">
          {/* The shutter "takes" one of the sample photos. */}
          <button
            type="button"
            aria-label="Take photo"
            onClick={() => choose(PHOTO_LIBRARY[Math.floor(Math.random() * PHOTO_LIBRARY.length)])}
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white active:scale-[.92]"
          >
            <div className="h-14 w-14 rounded-full bg-white" />
          </button>
        </div>
      </DarkPanel>
    )

  // Crop
  return (
    <DarkPanel>
      <div className="flex h-11 items-center justify-between px-4">
        <button type="button" onClick={() => setStage('source')} className="text-[15px] font-semibold">
          Retake
        </button>
        <div className="text-[15px] font-semibold">Crop</div>
        <div className="w-[50px]" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <div
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture?.(e.pointerId)
            dragFrom.current = { x: e.clientX - crop.x, y: e.clientY - crop.y }
          }}
          onPointerMove={(e) => {
            if (!dragFrom.current || e.buttons === 0) return
            setCrop((c) => ({ ...c, x: e.clientX - dragFrom.current.x, y: e.clientY - dragFrom.current.y }))
          }}
          onPointerUp={() => (dragFrom.current = null)}
          onPointerCancel={() => (dragFrom.current = null)}
          onWheel={(e) => zoom(-e.deltaY * 0.002)}
          className="relative h-[320px] w-[320px] max-w-[85vw] cursor-grab overflow-hidden rounded bg-black"
          style={{ touchAction: 'none' }}
        >
          <div className="absolute inset-0" style={{ background: `url(${pick}) center/cover`, transform: `translate(${crop.x}px,${crop.y}px) scale(${crop.s})`, transition: 'transform .05s linear' }} />
          {/* The rule-of-thirds grid */}
          <div
            className="pointer-events-none absolute inset-0 border-[1.5px] border-white/80"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.25) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.25) 1px,transparent 1px)', backgroundSize: '33.33% 33.33%' }}
          />
        </div>
        <div className="flex items-center gap-3.5 text-[12px] text-white/70">
          <button type="button" onClick={() => zoom(-0.25)} aria-label="Zoom out" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-[18px] text-white">
            −
          </button>
          Drag to move · pinch or scroll to zoom
          <button type="button" onClick={() => zoom(0.25)} aria-label="Zoom in" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-[18px] text-white">
            +
          </button>
        </div>
      </div>
      <div className="px-4">
        <button type="button" onClick={() => onDone(pick)} className="flex h-14 w-full items-center justify-center rounded-full bg-white text-[16px] font-semibold text-plum">
          Use photo
        </button>
      </div>
    </DarkPanel>
  )
}

// Full-screen viewer for your profile photos, with a "⋯" menu.
function PhotoViewer({ photos, index, setIndex, onClose, onReplace, onSetMain, onRemove }) {
  const [menu, setMenu] = useState(false)
  const startX = useRef(null)
  const go = (i) => {
    if (i >= 0 && i < photos.length) {
      setIndex(i)
      setMenu(false)
    }
  }
  return (
    <DarkPanel
      onPointerDown={(e) => (startX.current = e.clientX)}
      onPointerUp={(e) => {
        const d = e.clientX - (startX.current ?? e.clientX)
        if (d < -50) go(index + 1)
        else if (d > 50) go(index - 1)
      }}
    >
      <div className="flex h-11 items-center justify-between px-4">
        <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/12">
          <Icon name="close" size={18} />
        </button>
        <div className="text-[13px] text-white/70">
          {index + 1} of {photos.length}
        </div>
        <button type="button" onClick={() => setMenu(true)} aria-label="More" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-[18px] font-bold tracking-[1px]">
          ⋯
        </button>
      </div>
      <div className="relative flex flex-1 items-center justify-center">
        <div className="aspect-square w-full" style={{ background: `url(${photos[index]}) center/cover` }} />
        <button type="button" aria-label="Previous photo" onClick={() => go(index - 1)} className="absolute inset-y-0 left-0 w-1/4" />
        <button type="button" aria-label="Next photo" onClick={() => go(index + 1)} className="absolute inset-y-0 right-0 w-1/4" />
      </div>
      <div className="flex justify-center gap-1.5 py-2.5">
        {photos.map((p, i) => (
          <div key={p + i} className="h-1.5 w-1.5 rounded-full" style={{ background: i === index ? '#FFFFFF' : 'rgba(255,255,255,.4)' }} />
        ))}
      </div>
      {index === 0 && <div className="text-center text-[12px] text-white/70">Main photo · used as your avatar across the app</div>}
      {menu && (
        <ActionSheet
          onCancel={() => setMenu(false)}
          options={[
            { label: 'Replace', onClick: onReplace },
            { label: 'Set as profile picture', onClick: onSetMain },
            { label: 'Remove', danger: true, onClick: onRemove },
          ]}
        />
      )}
    </DarkPanel>
  )
}

// The three photo slots on Profile, plus the hint underneath.
//   photos   the saved list        onChange(newList)   save a new list
//   onFull   called when the third photo is added (for the XP reward)
export default function Photos({ photos, onChange, onFull }) {
  const [picking, setPicking] = useState(null) // the slot being filled, or null
  const [uploading, setUploading] = useState(null) // { slot, progress } while the upload animation runs
  const [viewer, setViewer] = useState(null) // index of the photo being viewed
  const [drag, setDrag] = useState(null) // { from, over } while reordering
  const holdTimer = useRef(null)

  // Pretend to upload: the ring fills up, then the photo appears.
  const upload = (src, slot) => {
    setPicking(null)
    ;[20, 45, 70, 90, 100].forEach((progress, i) => setTimeout(() => setUploading({ slot, progress }), 180 * (i + 1)))
    setTimeout(() => {
      setUploading(null)
      const list = [...photos]
      if (slot < list.length) list[slot] = src
      else list.push(src)
      onChange(list)
      if (list.length === MAX_PHOTOS && photos.length < MAX_PHOTOS) onFull?.()
    }, 1100)
  }

  const reorder = (from, to) => {
    if (from === to || to == null) return
    const list = [...photos]
    const [moved] = list.splice(from, 1)
    list.splice(to, 0, moved)
    onChange(list)
  }

  const missing = MAX_PHOTOS - photos.length

  return (
    <>
      <div className="mt-3.5 grid flex-none grid-cols-3 gap-2 px-1">
        {[0, 1, 2].map((i) => {
          const src = photos[i]
          const isUploading = uploading?.slot === i
          const isDragging = drag?.from === i
          const isTarget = drag && drag.over === i && drag.from !== i
          return (
            <button
              key={i}
              type="button"
              aria-label={src ? (i === 0 ? 'Main photo' : `Photo ${i + 1}`) : 'Add photo'}
              onClick={() => {
                if (drag) return
                if (src) setViewer(i)
                else setPicking(i)
              }}
              // Press and hold a photo to start dragging it.
              onPointerDown={() => {
                if (!src) return
                holdTimer.current = setTimeout(() => setDrag({ from: i, over: i }), 450)
              }}
              onPointerUp={() => {
                clearTimeout(holdTimer.current)
                if (drag) {
                  reorder(drag.from, drag.over)
                  setTimeout(() => setDrag(null), 0) // after the click event, so the click is ignored
                }
              }}
              onPointerEnter={() => drag && setDrag({ ...drag, over: i })}
              onPointerLeave={() => clearTimeout(holdTimer.current)}
              className="relative aspect-square overflow-hidden rounded-[18px] select-none"
              style={{
                background: src && !isUploading ? `url(${src}) center/cover` : 'transparent',
                transform: isDragging ? 'scale(1.08)' : isTarget ? 'scale(.94)' : 'scale(1)',
                boxShadow: isTarget ? '0 0 0 2px var(--acc)' : 'none',
                transition: 'transform .2s, box-shadow .2s',
                touchAction: 'none',
              }}
            >
              {!src && !isUploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-[18px] border-[1.5px] border-dashed border-mute text-mute">
                  <span className="text-[22px] leading-none">+</span>
                  <span className="text-[11px] font-medium">Add photo</span>
                </div>
              )}
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-sf2">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{ background: `conic-gradient(var(--acc) 0 ${uploading.progress}%,rgba(255,255,255,.25) ${uploading.progress}% 100%)` }}
                  >
                    <div className="h-[30px] w-[30px] rounded-full bg-sf2" />
                  </div>
                </div>
              )}
              {i === 0 && src && !isUploading && (
                <span className="absolute bottom-2 left-2 rounded-full bg-acc px-2 py-[3px] text-[10px] font-semibold text-acc-ink">Main</span>
              )}
            </button>
          )
        })}
      </div>

      {missing > 0 && !drag && (
        <div className="mt-2 flex flex-none items-center gap-1.5 px-1 text-[12px] text-mute">
          <CameraIcon size={14} />
          Add {missing} more photo{missing === 1 ? '' : 's'} so people recognise you at events
        </div>
      )}
      {drag && <div className="mt-2 flex-none px-1 text-[12px] font-semibold text-acc">Drag onto another slot to reorder · release to drop</div>}

      {picking !== null && <PhotoPicker onCancel={() => setPicking(null)} onDone={(src) => upload(src, picking)} />}

      {viewer !== null && photos[viewer] && (
        <PhotoViewer
          photos={photos}
          index={viewer}
          setIndex={setViewer}
          onClose={() => setViewer(null)}
          onReplace={() => {
            setPicking(viewer)
            setViewer(null)
          }}
          onSetMain={() => {
            reorder(viewer, 0)
            setViewer(0)
          }}
          onRemove={() => {
            onChange(photos.filter((_, k) => k !== viewer))
            setViewer(null)
          }}
        />
      )}
    </>
  )
}

function CameraIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

function GalleryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="M21 16l-5-5-9 9" />
    </svg>
  )
}
