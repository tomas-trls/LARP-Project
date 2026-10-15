// The lilac mascot on the "Not sure yet?" card (07a): one hand on its chin, eyebrows raised, thinking.
const PENTAGON = 'polygon(50% 0%,100% 38%,82% 100%,18% 100%,0% 38%)'
const INK = '#361A54'

export default function ThinkingMascot() {
  const limb = { position: 'absolute', width: 2.5, background: INK, borderRadius: 2 }
  return (
    <div style={{ position: 'relative', width: 64, height: 72, flex: 'none' }} aria-hidden="true">
      <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 100%', animation: 'larpSway 3.6s .4s ease-in-out infinite' }}>
        {/* left arm, swinging */}
        <div style={{ ...limb, left: 8, top: 28, height: 20, transform: 'rotate(28deg)', transformOrigin: 'top center', animation: 'larpArmL 3.6s .4s ease-in-out infinite' }} />
        {/* right arm, bent up to the chin */}
        <div style={{ ...limb, right: 8, top: 28, height: 14, transform: 'rotate(-40deg)', transformOrigin: 'top center' }}>
          <div style={{ ...limb, left: 0, top: 13, height: 14, transform: 'rotate(-105deg)', transformOrigin: 'top center' }}>
            <div style={{ position: 'absolute', left: -1.25, top: 12, width: 5, height: 5, borderRadius: '50%', background: INK }} />
          </div>
        </div>
        {/* body with eyebrows, eyes and a small frown */}
        <div style={{ position: 'absolute', left: 4, top: 0, width: 56, height: 52, background: '#DDBDFF', clipPath: PENTAGON }}>
          <div style={{ position: 'absolute', left: 15, top: 19, width: 10, height: 3, borderRadius: 2, background: INK, transform: 'rotate(-14deg)' }} />
          <div style={{ position: 'absolute', left: 31, top: 18, width: 10, height: 3, borderRadius: 2, background: INK }} />
          <div style={{ position: 'absolute', left: 17, top: 25, width: 6, height: 6, borderRadius: '50%', background: INK }} />
          <div style={{ position: 'absolute', left: 33, top: 23, width: 6, height: 6, borderRadius: '50%', background: INK }} />
          <div style={{ position: 'absolute', left: 23, top: 36, width: 10, height: 4, borderTop: `2px solid ${INK}`, borderRadius: '10px 10px 0 0', transform: 'rotate(-8deg)' }} />
        </div>
        {/* legs */}
        <div style={{ ...limb, left: 22, bottom: 5, height: 16 }} />
        <div style={{ ...limb, left: 39, bottom: 5, height: 16 }} />
      </div>
    </div>
  )
}
