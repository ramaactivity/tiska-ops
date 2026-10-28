// Jam pura-pura untuk server lokal saat merekam: "hari ini" = tanggal data demo (JAM_PALSU, ISO UTC), jam tetap berjalan.
// Dipakai: NODE_OPTIONS="--require <path>/jam-palsu.cjs" JAM_PALSU=2026-10-19T02:40:00Z npx next dev -p 3100
const Asli = Date, geser = Asli.parse(process.env.JAM_PALSU || "2026-10-19T02:40:00Z") - Asli.now();
function D(...a) {
  if (!new.target) return new Asli(Asli.now() + geser).toString();
  return a.length ? new Asli(...a) : new Asli(Asli.now() + geser);
}
D.prototype = Asli.prototype;
D.now = () => Asli.now() + geser;
D.parse = Asli.parse;
D.UTC = Asli.UTC;
globalThis.Date = D;
