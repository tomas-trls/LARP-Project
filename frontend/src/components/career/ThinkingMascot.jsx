// The lilac mascot on the "Not sure yet?" card (07a): one hand on its chin, eyebrows raised, thinking.
const PENTAGON = 'polygon(50% 0%,100% 38%,82% 100%,18% 100%,0% 38%)'
const INK = '#361A54'

export default function ThinkingMascot({ style }) {
  const limb = { position: 'absolute', width: 2.5, background: INK, borderRadius: 2 }
  return (
    <div style={{ position: 'relative', width: 64, height: 72, flex: 'none', ...style }} aria-hidden="true">
      <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 100%', animation: 'larpSway 3.6s .4s ease-in-out infinite' }}>
        {/* left arm, swinging */}
        <div style={{ ...limb, left: 8, top: 28, height: 20, transform: 'rotate(28deg)', transformOrigin: 'top center', animation: 'larpArmL 3.6s .4s ease-in-out infinite' }} />
        {/* right arm, bent up to the chin */}
        <div style={{ ...limb, right: 8, top: 28, height: 14, transform: 'rotate(-40deg)', transformOrigin: 'top center' }}>
          <div style={{ ...limb, left: 0, top: 13, height: 14, transform: 'rotate(-105deg)', transformOrigin: 'top center' }}>
            <div style={{ position: 'absolute', left: -1.25, top: 12, width: 5, height: 5, borderRadius: '50%', background: INK }} />
          </div>
        </div>
        {/* body with raised eyebrows, eyes and a flat, thinking mouth */}
        <div style={{ position: 'absolute', left: 4, top: 0, width: 56, height: 52, background: '#DDBDFF', clipPath: PENTAGON }}>
          <div style={{ position: 'absolute', left: 16, top: 15, width: 10, height: 3, borderRadius: 2, background: INK, transform: 'rotate(-8deg)' }} />
          <div style={{ position: 'absolute', left: 32, top: 14, width: 10, height: 3, borderRadius: 2, background: INK, transform: 'rotate(6deg)' }} />
          <div style={{ position: 'absolute', left: 19, top: 21, width: 6, height: 6, borderRadius: '50%', background: INK }} />
          <div style={{ position: 'absolute', left: 35, top: 20, width: 6, height: 6, borderRadius: '50%', background: INK }} />
          <div style={{ position: 'absolute', left: 26, top: 36, width: 8, height: 2.5, borderRadius: 2, background: INK, transform: 'rotate(-6deg)' }} />
        </div>
        {/* legs */}
        <div style={{ ...limb, left: 22, bottom: 5, height: 16 }} />
        <div style={{ ...limb, left: 39, bottom: 5, height: 16 }} />
      </div>
    </div>
  )
}
