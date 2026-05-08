export default function StoreLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-white/70 px-5 backdrop-blur-[8px]">
      <div className="w-full max-w-[430px] overflow-hidden rounded-[32px] border border-white/80 bg-white/98 p-8 text-center text-[#15130f] shadow-[0_30px_100px_rgba(0,0,0,0.18)]">
        <div
          className="relative mx-auto grid size-28 place-items-center rounded-[30px] text-4xl font-black text-white shadow-[0_22px_60px_rgba(0,0,0,0.16)]"
          style={{ backgroundColor: 'var(--primary-color, #E4002B)' }}
        >
          <span
            className="absolute inset-0 rounded-2xl"
            style={{
              backgroundColor: 'var(--primary-color, #E4002B)',
              animation: 'storeLoaderGlow 1.35s ease-in-out infinite',
            }}
          />
          <span className="relative">R</span>
        </div>

        <div className="mt-7 flex items-center justify-center gap-0.5 text-3xl font-black tracking-wide">
          {'Cargando'.split('').map((letter, index) => (
            <span
              key={`${letter}-${index}`}
              className="inline-block"
              style={{
                color: 'var(--primary-color, #E4002B)',
                animation: 'storeLoadingText 1.15s ease-in-out infinite',
                animationDelay: `${index * 65}ms`,
              }}
            >
              {letter}
            </span>
          ))}
        </div>

        <div className="mt-5 flex h-5 items-center justify-center gap-1" aria-hidden="true">
          {[0, 1, 2].map(index => (
            <span
              key={index}
              className="block size-2.5 rounded-full bg-[var(--primary-color,#E4002B)]"
              style={{
                animation: 'storeLoadingDot 900ms ease-in-out infinite',
                animationDelay: `${index * 140}ms`,
              }}
            />
          ))}
        </div>

        <div className="mt-8 h-2.5 overflow-hidden rounded-full bg-black/8">
          <div
            className="h-full rounded-full"
            style={{
              backgroundColor: 'var(--primary-color, #E4002B)',
              animation: 'storeLoaderBar 1.15s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    </div>
  )
}
