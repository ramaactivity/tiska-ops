/**
 * Hijab untuk avatar Notionists (D-061). Gaya Notionists tidak punya pilihan
 * hijab, jadi digambar sendiri di koordinat kanvasnya (1744×1744, kepala
 * menghadap kanan): menggantikan lapisan rambut, menutup kepala, telinga,
 * leher, dan jatuh ke bahu. Lubang wajah mengikuti garis pipi & dagu base.
 */
const LUAR =
  "M1135 1065 C1165 990 1180 880 1178 760 C1176 620 1140 500 1050 440 C960 385 820 380 700 410 C590 440 510 520 470 640 C445 730 455 850 490 950 C505 990 520 1015 535 1030 C470 1090 420 1170 385 1265 C520 1300 700 1290 850 1255 C980 1225 1090 1180 1145 1125 C1160 1105 1155 1085 1135 1065 Z";
const WAJAH =
  "M745 680 C840 632 990 622 1115 652 C1127 750 1115 845 1095 900 C1065 975 995 1042 900 1064 C840 1072 800 1050 778 1022 C738 955 718 865 720 785 C722 735 732 700 745 680 Z";
const LIPATAN = [
  "M785 1085 C700 1125 590 1180 470 1240",
  "M905 1092 C990 1110 1065 1100 1125 1075",
  "M545 590 C510 690 505 800 540 905",
];

export const LAPISAN_HIJAB = `<path fill-rule="evenodd" d="${LUAR} ${WAJAH}" fill="#fff" stroke="#000" stroke-width="16" stroke-linejoin="round"/>${LIPATAN.map((d) => `<path d="${d}" stroke="#000" stroke-width="12" stroke-linecap="round" fill="none"/>`).join("")}`;

/** Ganti lapisan rambut SVG Notionists dengan hijab. */
export function pakaiHijab(svg: string): string {
  return svg.replace(/<g transform="translate\(266 207\)">[\s\S]*?<\/g>(?=<g transform="translate\(791 871\)">)/, `<g>${LAPISAN_HIJAB}</g>`);
}
