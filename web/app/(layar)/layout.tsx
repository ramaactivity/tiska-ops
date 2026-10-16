/** Kerangka layar TV (D-055): layar penuh gelap, tanpa navigasi. */
export default function LayoutLayar({ children }: LayoutProps<"/">) {
  return <div className="dark min-h-dvh bg-[#0f1411] text-[#f2efe6]">{children}</div>;
}
