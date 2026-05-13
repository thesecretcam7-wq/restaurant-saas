import StoreLoadingCard from '@/components/store/StoreLoadingCard'

export default function TenantLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_50%_18%,rgba(217,164,65,0.14),transparent_34%),linear-gradient(180deg,#100d08,#040404_56%,#020202)] px-5">
      <StoreLoadingCard />
    </div>
  )
}
