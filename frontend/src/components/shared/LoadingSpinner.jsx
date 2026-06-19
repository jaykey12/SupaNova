const SIZE_MAP = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
}

function LoadingSpinner({ size = 'md' }) {
  return (
    <span
      className={`${SIZE_MAP[size]} inline-block animate-spin rounded-full border-slate-300 border-t-indigo-500`}
      aria-label="Loading"
    />
  )
}

export default LoadingSpinner
