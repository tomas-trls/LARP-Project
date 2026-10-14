// Drawing for the Network card: a laptop showing connected dots, and a lanyard badge.
// Flat shapes in the LARP palette. It is decoration only, so screen readers skip it (aria-hidden).
function NetworkArt() {
  return (
    <svg viewBox="0 0 320 176" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {/* soft background shapes */}
      <circle cx="40" cy="30" r="46" fill="#ddbdff" />
      <circle cx="292" cy="150" r="56" fill="#ddbdff" />

      {/* laptop */}
      <rect x="52" y="44" width="150" height="92" rx="12" fill="#ffffff" stroke="#361a54" strokeWidth="3" />
      <rect x="62" y="54" width="130" height="72" rx="6" fill="#eedeff" />
      <rect x="36" y="136" width="182" height="12" rx="6" fill="#361a54" />

      {/* connected dots on the screen */}
      <path d="M92 104 L127 74 L164 100 M127 74 L127 112" stroke="#361a54" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="92" cy="104" r="9" fill="#993bff" />
      <circle cx="127" cy="74" r="11" fill="#361a54" />
      <circle cx="164" cy="100" r="9" fill="#ba82ff" />
      <circle cx="127" cy="112" r="7" fill="#ffffff" stroke="#361a54" strokeWidth="2.5" />

      {/* lanyard badge */}
      <path d="M244 0 L252 52" stroke="#361a54" strokeWidth="4" strokeLinecap="round" />
      <path d="M268 0 L260 52" stroke="#361a54" strokeWidth="4" strokeLinecap="round" />
      <rect x="226" y="50" width="62" height="84" rx="12" fill="#993bff" />
      <rect x="248" y="58" width="18" height="5" rx="2.5" fill="#ddbdff" />
      <circle cx="257" cy="86" r="14" fill="#ffffff" />
      <path d="M243 120 Q257 100 271 120" fill="#ffffff" />
      <rect x="240" y="122" width="34" height="5" rx="2.5" fill="#ddbdff" />
    </svg>
  )
}

export default NetworkArt
