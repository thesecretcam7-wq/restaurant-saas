interface EccofoodLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
  textClassName?: string
}

const sizes = {
  xs: 'size-6 rounded-md',
  sm: 'size-8 rounded-lg',
  md: 'size-10 rounded-xl',
  lg: 'size-14 rounded-2xl',
}

export default function EccofoodLogo({
  size = 'md',
  showText = true,
  className = '',
  textClassName = 'text-lg font-black tracking-tight text-[#101010]',
}: EccofoodLogoProps) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <span className={`inline-flex overflow-hidden bg-black shadow-xl shadow-black/15 ${sizes[size]}`}>
        <img
          src="/eccofood-logo.png"
          alt="Eccofood"
          className="h-full w-full scale-110 object-cover"
        />
      </span>
      {showText && <span className={textClassName}>Eccofood</span>}
    </span>
  )
}
