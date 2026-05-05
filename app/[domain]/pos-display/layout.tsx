export default function PosDisplayLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f5f0]">
      {children}
    </div>
  );
}
