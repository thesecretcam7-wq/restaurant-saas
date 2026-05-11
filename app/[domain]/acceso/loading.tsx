import StoreLoadingCard from '@/components/store/StoreLoadingCard';

export default function AccessLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-white/70 px-5 backdrop-blur-[8px]">
      <StoreLoadingCard />
    </div>
  );
}
