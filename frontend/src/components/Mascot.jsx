// The little pentagon character from the design, with dot eyes, a smile, arms and legs.
// It sways gently (the larpSway animation in index.css).
//   <Mascot />                         62px wide, lilac (as on 03 Profile creator and Home)
//   <Mascot size={40} color="#30D6FF" />
const PENTAGON = 'polygon(50% 0%,100% 38%,82% 100%,18% 100%,0% 38%)'

export default function Mascot({ size = 62, color = '#DDBDFF', face = '#361A54', className = '', style }) {
  // Everything is drawn at 62px wide and scaled, so any size keeps the same proportions.
  const scale = size / 62
  const limb = { position: 'absolute', width: 2.5, background: face, borderRadius: 2 }
  return (
    // "relative" by default, but a className like "absolute right-4 top-3" can place it instead.
    <div className={`${/\b(absolute|fixed)\b/.test(className) ? '' : 'relative'} ${className}`} style={{ width: size, height: 74 * scale, ...style }} aria-hidden="true">
      <div style={{ position: 'absolute', left: 0, top: 0, width: 62, height: 74, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 100%', animation: 'larpSway 3.4s .2s ease-in-out infinite' }}>
          <div style={{ ...limb, left: 5, top: 32, height: 22, transform: 'rotate(28deg)', transformOrigin: 'top center', animation: 'larpArmL 3.4s .2s ease-in-out infinite' }} />
          <div style={{ ...limb, right: 5, top: 32, height: 22, transform: 'rotate(-28deg)', transformOrigin: 'top center', animation: 'larpArmR 3.4s .2s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', left: 0, top: 0, width: 62, height: 58, background: color, clipPath: PENTAGON }}>
            <div style={{ position: 'absolute', left: 19, top: 26, width: 6, height: 6, borderRadius: '50%', background: face }} />
            <div style={{ position: 'absolute', left: 37, top: 26, width: 6, height: 6, borderRadius: '50%', background: face }} />
            <div style={{ position: 'absolute', left: 26, top: 36, width: 10, height: 6, borderBottom: `2px solid ${face}`, borderRadius: '0 0 10px 10px' }} />
          </div>
          <div style={{ ...limb, left: 21, bottom: 0, height: 16 }} />
          <div style={{ ...limb, left: 38, bottom: 0, height: 16 }} />
        </div>
      </div>
    </div>
  )
}

export { PENTAGON }
