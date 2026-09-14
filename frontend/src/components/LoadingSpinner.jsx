/**
 * LoadingSpinner — accessible animated spinner.
 * Sizes: sm | md | lg | xl
 */

const sizes = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-3',
  xl: 'w-16 h-16 border-4',
}

export default function LoadingSpinner({ size = 'md', className = '' }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`
        ${sizes[size] || sizes.md}
        rounded-full
        border-slate-700
        border-t-sky-400
        animate-spin
        ${className}
      `}
    />
  )
}

