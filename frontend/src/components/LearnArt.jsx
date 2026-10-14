// Drawing for the Learn and get help card: a stack of books, a lightbulb idea, and a "helping hand" check mark,
// on dark purple. Heritage blue is only used here because it sits on dark purple (the design rule).
function LearnArt() {
  return (
    <svg viewBox="0 0 320 176" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {/* glow behind the bulb */}
      <circle cx="232" cy="64" r="46" fill="#56338a" />

      {/* stack of books */}
      <rect x="52" y="116" width="156" height="30" rx="8" fill="#ba82ff" />
      <rect x="64" y="84" width="132" height="30" rx="8" fill="#ffffff" />
      <rect x="44" y="52" width="148" height="30" rx="8" fill="#ddbdff" />
      <g fill="#361a54">
        <rect x="64" y="126" width="64" height="6" rx="3" />
        <rect x="78" y="94" width="48" height="6" rx="3" />
        <rect x="58" y="62" width="56" height="6" rx="3" />
      </g>

      {/* lightbulb */}
      <path d="M232 28 a26 26 0 0 1 14 48 v10 h-28 v-10 a26 26 0 0 1 14 -48 z" fill="#30d6ff" />
      <rect x="220" y="90" width="24" height="8" rx="4" fill="#ffffff" />
      <rect x="224" y="102" width="16" height="6" rx="3" fill="#ffffff" />
      <g stroke="#30d6ff" strokeWidth="3.5" strokeLinecap="round">
        <path d="M232 8 v8" />
        <path d="M196 20 l6 6" />
        <path d="M268 20 l-6 6" />
        <path d="M184 60 h8" />
        <path d="M280 60 h-8" />
      </g>

      {/* a tick: "task done, help given" */}
      <circle cx="262" cy="132" r="20" fill="#993bff" />
      <path d="M252 132 L259 139 L273 124" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

export default LearnArt
