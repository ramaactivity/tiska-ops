// Kamus ucapan untuk suara AI berbahasa Indonesia: kata Inggris/singkatan ditulis sesuai bunyinya.
// Hanya untuk suara — teks di layar & narasi.txt (bahan ElevenLabs/Magnific) tetap ejaan aslinya.
// Tambah kata baru di sini bila ada yang terdengar aneh.
const KAMUS = [
  ["coffee break", "kofi brek"], ["lunch box", "lanc boks"], ["stock opname", "stok opname"], ["real-time", "ril taim"], ["real time", "ril taim"],
  ["follow up", "folo ap"], ["follow-up", "folo ap"], ["price list", "prais lis"],
  ["dashboard", "desbord"], ["quotation", "kuotesyen"], ["invoice", "invois"], ["captain", "kapten"], ["packing", "peking"],
  ["box", "boks"], ["owner", "ouner"], ["grandmax", "grenmeks"], ["update", "apdet"], ["event", "iven"], ["brief", "brif"],
  ["driver", "draiver"], ["sales", "seils"], ["finance", "fainens"], ["upload", "aplod"], ["download", "daunlod"],
  ["user", "yuser"], ["margin", "marjin"], ["payment", "pemen"], ["lead", "lid"], ["pricelist", "prais lis"],
  ["delivery fee", "deliveri fi"], ["layar dapur", "layar dapur"], ["online", "onlain"], ["link", "lingk"], ["toast", "tos"],
  // singkatan dieja per huruf
  ["PIC", "pi ai si"], ["DP", "de pe"], ["PR", "pe er"], ["PO", "pe o"], ["HPP", "ha pe pe"], ["PBJT", "pe be je te"],
  ["WA", "we a"], ["HP", "ha pe"], ["DW", "de we"], ["BAST", "bast"], ["PDF", "pe de ef"], ["PPN", "pe pe en"], ["S&K", "es dan ka"],
];
const pola = KAMUS.map(([a, b]) => [new RegExp(`(?<![\\p{L}])${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, /^[A-Z&]+$/.test(a) ? "gu" : "giu"), b]);
export const ucapkan = (teks) => pola.reduce((s, [re, b]) => s.replace(re, b), teks);
