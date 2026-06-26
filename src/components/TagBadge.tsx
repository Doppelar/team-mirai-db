interface TagBadgeProps {
  name: string
  color?: string
  size?: 'sm' | 'md'
}

export default function TagBadge({ name, color = '#3B82F6', size = 'sm' }: TagBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium text-white ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
      style={{ backgroundColor: color }}
    >
      {name}
    </span>
  )
}
