// Turns the plans and memories in src/data/memories.js into what the Profile cards need.
import { CAT, EVENTS, EVENT_GROUPS, PLANS } from '../../data/memories.js'
import { firstNameOf } from '../messages/avatar.js'

// Turns the data for one plan into what the card needs.
export function planList() {
  return PLANS.map(({ key, daysAway }) => {
    const ev = EVENTS[key]
    const group = EVENT_GROUPS[key]
    const others = group ? group.joined.filter((p) => p !== 'maya') : []
    return {
      key,
      ev,
      daysAway,
      countdown: daysAway === 0 ? 'Today' : daysAway === 1 ? 'Tomorrow' : `In ${daysAway} days`,
      avatars: group ? group.joined.slice(0, 4) : [],
      // "You + Leila + 3" when you go with a group, "Booked · solo" when not.
      whoLine: group ? `You${others.length ? ` + ${firstNameOf(others[0])}${others.length > 1 ? ` + ${others.length - 1}` : ''}` : ''}` : 'Booked · solo',
      chat: group?.chat,
    }
  })
}

// One memory, with the student's own photos and note added on top of the sample data.
export function memoryView(m, saved) {
  const photos = [...(m.photo ? [m.photo] : []), ...(saved.photos[m.id] ?? [])]
  return {
    ...m,
    photos,
    note: saved.notes[m.id] ?? m.note,
    cover: photos[0] ? `url(${photos[0]}) center/cover` : CAT[m.cat][0],
    ink: CAT[m.cat][1],
    whoLine: m.met.length ? `With ${m.met.map(firstNameOf).join(', ')}` : 'Went solo',
  }
}
