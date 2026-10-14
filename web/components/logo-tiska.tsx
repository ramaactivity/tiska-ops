import Image from "next/image";

/**
 * Logo resmi Tiska (versi ® terbaru), dipotong rapat ke tepinya untuk web.
 * Sumber utuh 2000×2000 ada di public/brand/. Jangan dirakit ulang dari
 * potongan ornamen atau tulisan — tampilkan file resminya (DESIGN.md).
 */
const LOGO = {
  landscape: { src: "/brand/tiska-logo-landscape-emas-web.png", lebar: 360, tinggi: 170 },
  portrait: { src: "/brand/tiska-logo-portrait-emas-web.png", lebar: 320, tinggi: 419 },
} as const;

export function LogoTiska({
  varian = "landscape",
  tinggi,
  className,
}: {
  varian?: keyof typeof LOGO;
  tinggi: number;
  className?: string;
}) {
  const l = LOGO[varian];
  return (
    <Image
      src={l.src}
      alt="Tiska Catering"
      width={Math.round((l.lebar * tinggi) / l.tinggi)}
      height={tinggi}
      className={className}
      priority
    />
  );
}
