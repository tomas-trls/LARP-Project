// Drawing for the Connect card: friendly flat "people" shapes and speech bubbles, on bright purple.
function ConnectArt() {
  return (
    <svg viewBox="0 0 320 176" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {/* three overlapping people: a circle, a rounded square and a pentagon-ish blob */}
      <circle cx="104" cy="96" r="48" fill="#ffffff" />
      <rect x="140" y="52" width="92" height="92" rx="30" fill="#ddbdff" />
      <path d="M232 62 L276 94 L260 146 L204 146 L188 94 Z" fill="#ba82ff" transform="translate(18 4)" />

      {/* faces (two dots and a smile on each) */}
      <g fill="#361a54">
        <circle cx="90" cy="88" r="4.5" />
        <circle cx="118" cy="88" r="4.5" />
        <circle cx="172" cy="90" r="4.5" />
        <circle cx="200" cy="90" r="4.5" />
        <circle cx="246" cy="106" r="4.5" />
        <circle cx="272" cy="106" r="4.5" />
      </g>
      <g stroke="#361a54" strokeWidth="3.5" strokeLinecap="round" fill="none">
        <path d="M92 108 Q104 120 116 108" />
        <path d="M174 110 Q186 122 198 110" />
        <path d="M248 124 Q259 134 270 124" />
      </g>

      {/* speech bubbles */}
      <rect x="40" y="18" width="62" height="30" rx="15" fill="#ffffff" />
      <path d="M62 46 L56 58 L74 47 Z" fill="#ffffff" />
      <circle cx="60" cy="33" r="3.5" fill="#993bff" />
      <circle cx="71" cy="33" r="3.5" fill="#993bff" />
      <circle cx="82" cy="33" r="3.5" fill="#993bff" />
      <rect x="230" y="20" width="52" height="26" rx="13" fill="#eedeff" />
      <path d="M262 44 L270 55 L252 45 Z" fill="#eedeff" />
      <path d="M248 33 L254 39 L266 27" stroke="#993bff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

export default ConnectArt
