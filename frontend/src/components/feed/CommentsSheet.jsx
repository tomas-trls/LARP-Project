// The comments under a group post: the event and places at the top, the thread (replies indented),
// quick replies, and a box to write your own. Opens from Home, People › Career and People › Social.
import { useState } from 'react'
import Icon from '../Icon.jsx'
import { QUICK_REPLIES } from '../../data/feed.js'
import { SOCIAL_PEOPLE } from '../../data/people.js'
import { Face, FeedSheet, HeartIcon, JoinButton, SendIcon, Spots } from './parts.jsx'
import { ME, nameOf } from './useFeed.js'

export default function CommentsSheet({ group, feed, onClose }) {
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState(null) // the comment you're answering, if any

  // Put each reply straight under the comment it answers.
  const thread = []
  for (const c of group.comments.filter((c) => !c.re)) {
    thread.push(c)
    for (const r of group.comments.filter((r) => r.re === c.id)) thread.push({ ...r, isReply: true })
  }

  const send = () => {
    if (!text.trim()) return
    feed.addComment(group.id, text.trim(), replyTo?.id)
    setText('')
    setReplyTo(null)
  }

  const reply = (c) => {
    // Replies always attach to the top comment, like the design.
    setReplyTo({ id: c.re || c.id, name: nameOf(c.by).split(' ')[0] })
    if (!text) setText(`@${nameOf(c.by).split(' ')[0]} `)
  }

  return (
    <FeedSheet onClose={onClose} height="75%" label="Comments">
      {/* The event and who's in */}
      <div className="flex flex-none flex-col gap-2.5 border-b border-line px-[18px] pb-3">
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="text-[15px] leading-[1.3] font-semibold">{group.ev.title}</div>
            <div className="mt-0.5 text-[12px] text-mute">
              {group.ev.dateLabel} · {group.ev.time} · {group.ev.place}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-sf2 text-mute">
            <Icon name="close" size={14} strokeWidth={2.5} />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex-none">
              <Spots group={group} size={22} gap={4} nowrap />
            </div>
            <span className="text-[12px] whitespace-nowrap text-mute">{group.progress}</span>
          </div>
          <JoinButton group={group} onJoin={feed.join} className="h-9 flex-none px-3.5" />
        </div>
      </div>

      {/* The thread */}
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-[18px] py-3">
        <div className="text-[11px] font-semibold tracking-[.06em] text-mute uppercase">
          {group.comments.length ? `${group.comments.length} comment${group.comments.length === 1 ? '' : 's'}` : 'No comments yet'}
        </div>
        {thread.map((c) => {
          const liked = feed.liked.includes(c.id)
          const likes = c.likes + (liked ? 1 : 0)
          const alumni = c.by !== ME && SOCIAL_PEOPLE[c.by]?.alumni
          return (
            <div key={c.id} className="flex gap-2.5" style={{ paddingLeft: c.isReply ? 44 : 0 }}>
              <div className="relative flex-none">
                <Face who={c.by} />
                {alumni && <div className="absolute -right-px -bottom-px box-border h-[11px] w-[11px] rounded-full border-2 border-sf bg-blue" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[13px] font-semibold">{c.by === ME ? 'You' : nameOf(c.by)}</span>
                  {alumni && <span className="text-[10px] font-semibold text-blue">Alumni</span>}
                  {group.members.includes(c.by) && (
                    <span className="rounded-full bg-sf2 px-[7px] py-0.5 text-[10px] font-semibold text-acc">Going</span>
                  )}
                  <span className="text-[11px] text-mute">{c.ago}</span>
                </div>
                <div className="mt-[3px] text-[13px] leading-[1.45]">{c.text}</div>
                <div className="mt-1.5 flex items-center gap-3.5 text-[12px] font-semibold text-mute">
                  <button type="button" onClick={() => reply(c)}>
                    Reply
                  </button>
                  <button type="button" onClick={() => feed.toggleLike(c.id)} aria-pressed={liked} className={`flex items-center gap-1 ${liked ? 'text-acc' : ''}`}>
                    <HeartIcon filled={liked} />
                    {likes > 0 ? likes : ''}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        {thread.length === 0 && (
          <div className="py-6 text-center text-[13px] leading-normal text-mute">Be the first to say hi. A quick “I’m in!” gets groups moving.</div>
        )}
      </div>

      {/* Write a comment */}
      <div className="flex flex-none flex-col gap-2.5 border-t border-line bg-sf px-[18px] pt-2.5 pb-[max(30px,env(safe-area-inset-bottom))]">
        {replyTo && (
          <div className="flex items-center justify-between text-[12px] text-mute">
            <span>Replying to {replyTo.name}</span>
            <button type="button" onClick={() => setReplyTo(null)} className="font-semibold text-acc">
              Cancel
            </button>
          </div>
        )}
        <div className="no-scrollbar -mx-[18px] flex gap-1.5 overflow-x-auto px-[18px]">
          {QUICK_REPLIES.map((q) => (
            <button key={q} type="button" onClick={() => setText(q)} className="h-8 flex-none rounded-full bg-sf2 px-3 text-[12px] font-medium whitespace-nowrap">
              {q}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Face who={ME} />
          <div className="flex h-11 min-w-0 flex-1 items-center rounded-full bg-sf2 px-4">
            <input
              value={text}
              placeholder="Add a comment…"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              className="h-11 min-w-0 flex-1 border-none bg-transparent text-[14px] text-ink outline-none placeholder:text-mute"
            />
          </div>
          <button
            type="button"
            onClick={send}
            aria-label="Send"
            className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-cta text-cta-ink transition-opacity"
            style={{ opacity: text.trim() ? 1 : 0.45 }}
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </FeedSheet>
  )
}
