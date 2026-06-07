export default function Card({ title, subtitle, children, action, className = '', noPad = false }) {
  return (
    <div
      className={[
        'glass rounded-2xl border border-white/[0.08] card-hover',
        className,
      ].join(' ')}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            {title && (
              <h3 className="text-white font-semibold text-base">{title}</h3>
            )}
            {subtitle && (
              <p className="text-[#a991c7] text-xs mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className={noPad ? '' : 'p-5'}>{children}</div>
    </div>
  )
}
