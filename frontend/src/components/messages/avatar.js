// Small helpers for showing people in chats and on Profile.
import { PEOPLE } from '../../data/messages.js'

export const DEFAULT_PHOTO = '/photos/sample-1.png'

// The CSS background for someone's round avatar.
//   'maya'       -> your main profile photo (or lilac stripes if you removed every photo)
//   'committee'  -> the accent colour (society committee posts)
//   'careers'    -> plain surface (UCL Careers)
//   anyone else  -> their colour from PEOPLE
export function avatarBg(id, myPhoto) {
  if (id === 'maya') return myPhoto ? `url(${myPhoto}) center/cover` : 'repeating-linear-gradient(135deg,#DDBDFF 0 4px,#BA82FF 4px 8px)'
  if (id === 'committee') return 'var(--acc)'
  if (id === 'careers') return 'var(--sf2)'
  return PEOPLE[id]?.[1] ?? 'var(--sf2)'
}

// 'priya' -> 'Priya Raman', 'maya' -> 'You' style names for chat headers.
export function nameOf(id) {
  if (id === 'maya') return 'Maya'
  if (id === 'committee') return 'Committee'
  if (id === 'careers') return 'UCL Careers'
  return PEOPLE[id]?.[0] ?? id
}

export const firstNameOf = (id) => nameOf(id).split(' ')[0]

// A row of small overlapping avatar circles.
//   avatars: list of CSS backgrounds   size: circle size in px   border: the ring colour around each
export function stackStyle(bg, size, border) {
  return { width: size, height: size, borderRadius: '50%', marginLeft: -6, border: `2px solid ${border}`, background: bg, flex: 'none' }
}
