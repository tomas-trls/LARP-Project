// One of the three cards on the landing page (Network, Connect, Learn and get help).
//
// - `art` is the drawing shown at the top of the card.
// - `background` is the Tailwind colour class behind the drawing.
// - `photo` (optional) is a picture that, if the file exists, is shown on top of the drawing.
//   If the file is missing the browser fires an error and we simply hide it, so the drawing stays.
function PillarCard({ label, title, text, art, background, photo, photoAlt }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-3xl border border-brand-pale bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className={`relative h-44 ${background}`}>
        {art}
        {photo && (
          <img
            src={photo}
            alt={photoAlt || ''}
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <span className="w-fit rounded-full bg-brand-pale px-3 py-1 text-xs font-medium text-ink dark:bg-white/10 dark:text-brand-light">
          {label}
        </span>
        <h2 className="font-display text-3xl font-medium leading-tight">{title}</h2>
        <p className="text-base leading-relaxed text-muted dark:text-white/75">{text}</p>
      </div>
    </article>
  )
}

export default PillarCard
