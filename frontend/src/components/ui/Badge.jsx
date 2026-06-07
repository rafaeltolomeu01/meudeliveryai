const colorMap = {
  green: 'bg-green-500/10 text-green-400 border-green-500/20',
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  gray: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  pink: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
}

const dotColorMap = {
  green: 'bg-green-400',
  red: 'bg-red-400',
  yellow: 'bg-yellow-400',
  blue: 'bg-blue-400',
  orange: 'bg-orange-400',
  gray: 'bg-gray-400',
  purple: 'bg-purple-400',
  cyan: 'bg-cyan-400',
  pink: 'bg-pink-400',
}

const sizeMap = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
}

export default function Badge({ color = 'gray', size = 'md', children, dot = true, className = '' }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 font-medium border rounded-full',
        colorMap[color] || colorMap.gray,
        sizeMap[size] || sizeMap.md,
        className,
      ].join(' ')}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColorMap[color] || dotColorMap.gray}`} />
      )}
      {children}
    </span>
  )
}
