#!/usr/bin/env node
// Tarra Zebra-tarrakirjoittimelle EPL2:lla CUPS-jonon kautta (läpivienti-PPD zebra-epl.ppd samassa kansiossa).
// Ei riippuvuuksia, node ≥ 18.3. Mitat annetaan millimetreinä ja muunnetaan pisteiksi --dpi:n mukaan
// (TLP3842 = 300 dpi, GC420d = 203 dpi), joten sama komento toimii molemmilla tulostimilla.
//
//   node tarra.js "teksti" [viivakoodi] [--kpl N] [--jono zebra] [--dpi 300|203] [--koko pieni|iso] [--qr sisältö]
//                 [--rivi2 "toinen rivi"] [--x mm] [--y mm] [--nayta]
//   node tarra.js --kalibrointi [--dpi 203] [--koko pieni] [--jono pikkuzebra]   kehys + mm-asteikko tarran paikan mittaukseen
//   node tarra.js --epl tiedosto.epl [--jono …]                                   valmis EPL-tiedosto sellaisenaan
//
// Koot (mm): pieni = vanha TLP3842-asettelu (tarra ~37 × 8,5, rako 3,4, alkaa 28 mm kirjoituspään reunasta),
//            iso   = 51 × 25 (rako 3), inventaariotarrojen rulla.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const D = path.dirname(new URL(import.meta.url).pathname);
const { values: opt, positionals: [teksti, viivakoodi] } = parseArgs({
  allowPositionals: true,
  options: {
    kpl: { type: 'string', default: '1' },
    jono: { type: 'string', default: 'zebra' },
    dpi: { type: 'string', default: '300' },
    koko: { type: 'string', default: 'pieni' },
    x: { type: 'string' },                 // tarran vasen reuna kirjoituspäästä (mm), ohittaa koon oletuksen
    leveys: { type: 'string' },            // tulostusleveys mm (kalibrointiin koko pää: TLP3842/GC420d 104)
    korkeus: { type: 'string' },           // tarran korkeus mm, ohittaa koon oletuksen
    y: { type: 'string' },                 // ylimääräinen pystysiirto (mm, voi olla negatiivinen)
    qr: { type: 'string' },                // QR oikeaan reunaan (vaatii swiftc:n ensimmäisellä kerralla)
    rivi2: { type: 'string' },             // toinen tekstirivi (iso tarra)
    epl: { type: 'string' },               // lähetä valmis EPL-tiedosto
    kalibrointi: { type: 'boolean', default: false },
    nayta: { type: 'boolean', default: false },   // EPL vain ruudulle
  },
});

const KOOT = {
  //        tulostusleveys  tarra korkeus  rako   x0 (tarran vasen reuna kirjoituspäästä)  tarraleveys
  pieni: { leveys: 85, korkeus: 8.5, rako: 3.4, x0: 28, tarraleveys: 37 },     // TLP3842, vanha pikkutarrarulla
  iso:   { leveys: 51, korkeus: 25,  rako: 3,   x0: 0, tarraleveys: 51 },      // TLP3842, inventaariorulla
  // GC420d:n apteekkirulla (reseptitarrat, suoralämpö): kaksi tarraa rinnakkain, mitattu kalibrointikehyksestä 12.11.2026
  'resepti-pieni': { leveys: 104, korkeus: 36, rako: 3, x0: 0, tarraleveys: 29 },
  'resepti-iso':   { leveys: 104, korkeus: 36, rako: 3, x0: 31, tarraleveys: 72 },   // oikeassa päässä ~6 mm punaista esipainatusta
};
const dpi = Number(opt.dpi) || 300;
const koko = { ...(KOOT[opt.koko] ?? virhe(`koko: ${Object.keys(KOOT).join('|')}`)) };
if (opt.leveys) koko.leveys = Number(opt.leveys);
if (opt.korkeus) koko.korkeus = Number(opt.korkeus);
const p = (mm) => Math.round(mm * dpi / 25.4);                                     // mm → pistettä
const x0 = p((opt.x !== undefined ? Number(opt.x) : koko.x0) + (opt.koko === 'iso' ? 2.5 : 0));
const dy = p(Number(opt.y ?? 0));
const epl = (s) => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');        // EPL:n lainausmerkit ja kenoviivat

function virhe(v) { console.error(v); process.exit(1); }
// Fontit 1–5: 203 dpi 8×12, 10×16, 12×20, 14×24, 32×48; 300 dpi 12×20, 16×28, 20×36, 24×44, 48×80 pistettä (lev × kork).
const A = (x, y, fontti, s) => `A${x},${y + dy},0,${fontti},1,1,N,"${epl(s)}"`;
const B = (x, y, tyyppi, kapea, leveä, korkeus, s) => `B${x},${y + dy},0,${tyyppi},${kapea},${leveä},${korkeus},N,"${epl(s)}"`;

// QR bittikarttana (GW): EPL2-firmikset eivät osaa 2D-koodeja. Matriisi qr-ohjelmalta (macOS CoreImage, qr.swift).
function qr(x, y, sisalto, m) {
  const bin = path.join(D, 'build', 'qr');
  if (!existsSync(bin)) {
    mkdirSync(path.dirname(bin), { recursive: true });
    execFileSync('swiftc', ['-O', path.join(D, 'qr.swift'), '-o', bin], { stdio: 'inherit' });
  }
  const rivit = execFileSync(bin, [sisalto, 'M'], { encoding: 'utf-8' }).trim().split('\n');
  const w = rivit[0].length * m, tavut = Math.ceil(w / 8), h = rivit.length * m, data = Buffer.alloc(tavut * h, 0xff);
  rivit.forEach((r, ry) => { for (let rx = 0; rx < r.length; rx++) if (r[rx] === '1') for (let ey = 0; ey < m; ey++) for (let ex = 0; ex < m; ex++) {
    const px = rx * m + ex, i = (ry * m + ey) * tavut + (px >> 3); data[i] &= ~(0x80 >> (px & 7)); } });   // GW: bitti 0 = musta
  return Buffer.concat([Buffer.from(`GW${x},${y + dy},${tavut},${h},`, 'latin1'), data]);
}

function tulosta(rivit) {
  const osat = ['\nN\n', `q${p(koko.leveys)}\n`, `Q${p(koko.korkeus)},${p(koko.rako)}\n`,
    ...rivit.map((r) => (Buffer.isBuffer(r) ? Buffer.concat([r, Buffer.from('\n')]) : `${r}\n`)), `P${Number(opt.kpl) || 1}\n`];
  laheta(Buffer.concat(osat.map((o) => (Buffer.isBuffer(o) ? o : Buffer.from(o, 'latin1')))),
    osat.map((o) => (Buffer.isBuffer(o) ? `<GW ${o.length} tavua>\n` : o)).join(''));
}
function laheta(data, kuvaus) {
  if (opt.nayta) { process.stdout.write(kuvaus ?? data.toString('latin1')); return; }
  execFileSync('/usr/bin/lp', ['-d', opt.jono, '-o', 'raw'], { input: data });
  console.log(`✔ jonoon ${opt.jono} (${dpi} dpi, ${opt.koko})`);
}

if (opt.epl) {
  laheta(readFileSync(opt.epl));
} else if (opt.kalibrointi) {
  // Kehys tarran nimellismitoille + pystyviiva ja luku joka 5 mm → mittaa tulosteesta, paljonko x0/korkeus heittää.
  const w = p(koko.leveys) - 1, h = p(koko.korkeus) - 1, rivit = [`X0,0,2,${w},${h}`];
  for (let mm = 5; mm < koko.leveys; mm += 5) rivit.push(`LO${p(mm)},0,1,${Math.min(h, p(mm % 10 ? 1 : 2))}`, ...(mm % 10 ? [] : [A(p(mm) + 2, p(1.3), 1, String(mm))]));
  for (let mm = 5; mm < koko.korkeus; mm += 5) rivit.push(`LO0,${p(mm)},${p(mm % 10 ? 1 : 2)},1`);
  rivit.push(A(x0 + p(1), p(Math.min(3, koko.korkeus / 3)), 1, `KALIB ${dpi}dpi ${opt.koko} x0=${opt.x ?? koko.x0}mm`));
  tulosta(rivit);
} else if (!teksti) {
  virhe('käyttö: node tarra.js "teksti" [viivakoodi] [--kpl N] [--jono zebra] [--dpi 300|203] [--koko pieni|iso] [--qr sisältö] [--nayta]');
} else if (koko.korkeus < 15) {
  // Matala tarra, vanha asettelu (rt0s_tarra.js): teksti fontti 2 ylös, Code 93 alle; pelkkä teksti isommalla fontilla 4.
  tulosta(viivakoodi
    ? [A(x0, p(1.7), 2, teksti), B(x0, p(4.2), 9, 2, 2, p(2.5), viivakoodi.toUpperCase())]
    : [A(x0, p(2.5), 4, teksti)]);
} else {
  // Korkea tarra (51 × 25, reseptitarrat): teksti fontti 4 (+ rivi 2 fontti 3), Code 128 alhaalla, QR oikealla (moduuli ~0,55 mm).
  const oikea = x0 + p(koko.tarraleveys - (opt.koko === 'resepti-iso' ? 6 : 0));   // tarran oikea reuna (esipainatus pois)
  const rivit = [A(x0, p(1.5), 4, teksti)];
  if (opt.rivi2) rivit.push(A(x0, p(6), 3, opt.rivi2));
  if (viivakoodi) rivit.push(B(x0, p(opt.rivi2 ? 11 : 8), 1, 2, 4, p(opt.qr ? 8 : 10), viivakoodi));
  if (opt.qr) rivit.push(qr(oikea - p(16), p(3), opt.qr, Math.max(3, Math.round(0.55 * dpi / 25.4))));
  tulosta(rivit);
}
