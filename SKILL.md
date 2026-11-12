---
name: zebra
description: Tulosta paperitarra Zebra-tarrakirjoittimelle (EPL2-malleja kuten TLP3842 300 dpi, GC420d 203 dpi) macOS:n CUPS-jonon kautta, ja ota uusi Zebra käyttöön Macilla (läpivienti-PPD, jono, feed-kalibrointi, tarran paikan mittaus kalibrointitarralla). Käytä, kun pyydetään Zebra-tarraa, tekstiä + viivakoodia tai QR:ää tarraan, tai kun Zebra on kytketty koneeseen eikä tulosta.
---

# Zebra-tarrat (EPL2) Macilla

Omavarainen paketti tässä kansiossa: `tarra.js` (ei riippuvuuksia, node ≥ 18.3), `zebra-epl.ppd` (läpivienti-PPD, jolla CUPS
lähettää EPL:n muuttamattomana), `qr.swift` (QR-matriisi macOS:n CoreImagella; kääntyy itse `build/qr`:ksi kun `--qr` annetaan
ensi kerran, vaatii Xcoden komentorivityökalut). Kansio toimii sellaisenaan Claude Code -skillinä: kopioi se `~/.claude/skills/zebra/`.

## Tulostimet ja rullat

| Tulostin | dpi | pistettä/mm | Tekniikka | Huom |
|---|---|---|---|---|
| Zebra TLP38xx / TLP28xx | 300 / 203 | 11,8 / 8,0 | lämpösiirto (värinauha) tai suoralämpö | TLP = värinauha, LP = suoralämpö |
| Zebra GC420d, GK420d | 203 | 8,0 | suoralämpö | ei värinauhaa: rullan on oltava suoralämpöpaperia |

- Kirjoituspää on 104 mm leveä. Kapea rulla ei välttämättä ala pään reunasta: tarran vasen reuna on `x0` mm:n päässä, joka mitataan
  kalibrointitarrasta (ks. käyttöönotto). Mitat pidetään `tarra.js`:n `KOOT`-taulussa millimetreinä.
- Tunnista rulla ennen tulostusta: suoralämpöpaperi tummuu kynnellä raapaistaessa tai sytyttimen lämmöstä, värinauhapaperi ei.
  Väärä rulla syöttyy normaalisti mutta jää tyhjäksi.

## Tulostus

```bash
cd ~/.claude/skills/zebra
node tarra.js "a6c380 anturi B" A6C380 --jono zebra --dpi 300          # matala tarra: teksti + Code 93
node tarra.js "KAAPPI 3" --jono zebra --dpi 300 --kpl 2                # matala tarra: pelkkä teksti isommalla
node tarra.js "LV0003 gateway" --koko iso --rivi2 "pannuhuone" --qr "SLV0003 1PLV" LV0003   # 51 × 25: teksti, rivi 2, Code 128, QR
node tarra.js "teksti" --nayta                                         # EPL ruudulle, ei tulosta
node tarra.js --epl valmis.epl --jono zebra                            # valmis EPL-tiedosto sellaisenaan
node tarra.js --kalibrointi --dpi 203 --jono zebra --leveys 104        # kehys + mm-asteikko tarran paikan mittaukseen
```

Valinnat: `--jono` (CUPS-jono, oletus `zebra`), `--dpi 300|203` (oletus 300; **203 dpi:n tulostimelle aina 203**, muuten mitat
menevät 1,5-kertaisiksi), `--koko` (`KOOT`-taulun nimi, oletus `pieni`), `--x mm` (tarran vasen reuna kirjoituspäästä), `--y mm`
(pystysiirto), `--leveys mm`, `--korkeus mm`, `--kpl N`, `--rivi2`, `--qr sisältö`, `--nayta`.

- Mitat annetaan millimetreinä ja `tarra.js` muuntaa ne pisteiksi dpi:n mukaan, joten sama komento toimii eri tulostimilla.
  Fontit eivät skaalaudu: fontti 1–5 = 203 dpi 8×12, 10×16, 12×20, 14×24, 32×48; 300 dpi 12×20, 16×28, 20×36, 24×44, 48×80 pistettä
  (leveys × korkeus; merkkiväli päälle noin 2 pistettä). **Fontti 5 osaa vain isot kirjaimet ja numerot.**
- Matala tarra (korkeus < 15 mm): teksti fontilla 2 ylhäällä, Code 93 alla (sisältö isoiksi kirjaimiksi). Ilman viivakoodia fontti 4.
- Korkea tarra: teksti fontilla 4, toinen rivi fontilla 3, Code 128 alhaalla, QR oikeassa reunassa.
- QR tehdään bittikarttana (GW-komento), koska vanhojen Zebrojen EPL2-firmis ei osaa 2D-koodeja. Moduuli ~0,55 mm, puhelimen kamera
  lukee. Hyvä sisältö inventaariotarroihin on ISO/IEC 15434 -henkinen `S<tunnus> 1P<koodi> 2S<sn> 9D<vvvv-kk>`.
- Ääkköset: lähetä rivi `I8,A,001` (Windows-1252) ja teksti latin1-koodattuna; `tarra.js` tekee tämän.
- Jonon tila `lpstat -p zebra`, työt `lpstat -o zebra`. Jono seisoo: tulostimen USB irti/kiinni ja `cupsenable zebra`.
- Pitkä sarja: tulosta yksi ja katso tulos, sitten loput `--kpl`.

## Uusi Zebra käyttöön Macilla

1. USB kiinni, tulostin päälle. `lpinfo -v | grep usb` → esim. `usb://Zebra%20Technologies/ZTC%20GC420d%20(EPL)?serial=XXXX`.
   `system_profiler SPUSBDataType | grep -A12 Zebra` näyttää myös komentokielen (`COMMAND SET:EPL`).
2. Jono läpivienti-PPD:llä (macOS ei salli raw-jonoa ilman PPD:tä; CUPSin "Printer drivers are deprecated" -varoitus on harmiton).
   Toimii ilman sudoa admin-käyttäjänä:
   ```bash
   lpadmin -p zebra -E -v 'usb://…?serial=XXXX' -P ~/.claude/skills/zebra/zebra-epl.ppd -o printer-is-shared=false -D "Zebra GC420d"
   lpstat -p zebra
   ```
   Jonon nimi tulostimen mukaan, jos tulostimia on useita (`zebra`, `pikkuzebra`); `tarra.js --jono` valitsee.
3. Rulla sisään, kansi kiinni, **feed-nappi kerran** → tulostin mittaa tarran ja raon. Jos se syöttää monta tarraa tai pysähtyy väärään
   kohtaan: AutoSense EPL-komennolla `printf '\nxa\n' | lp -d zebra -o raw` tai GC420d:llä feed pohjassa, kunnes valo vilkkuu kahdesti.
   **Tee AutoSense aina rullan vaihdon jälkeen**, muuten tulostimen käsitys tarran pituudesta on edellisen rullan ja kuva valuu väärään kohtaan.
4. Kalibrointitarra koko pään leveydellä: `node tarra.js --kalibrointi --dpi 203 --jono zebra --leveys 104 [--korkeus 36]`.
   Tulosteessa on kehys, pystyviiva 5 mm:n välein ja luku 10 mm:n välein kirjoituspään vasemmasta reunasta. Lue tarran vasemman reunan
   kohdalta millimetrit → `x0`; tarran leveys ja korkeus työntömitalla. Kirjaa `KOOT`-tauluun oma koko, niin komentoihin ei tarvita `--x`:ää.
5. Testi: `node tarra.js "TESTI 1" T1 --jono zebra --dpi 203 --koko <oma>` ja katso tuloste.

## EPL2 lyhyesti (kun tarra.js ei riitä)

Komennot rivi per komento, `\n` lopussa; tyhjä rivi + `N` alkuun tyhjentää puskurin. `q<leveys>` tulostusleveys pisteinä,
`Q<korkeus>,<rako>` tarran korkeus ja rako, `A<x>,<y>,<kierto>,<fontti>,<xkerroin>,<ykerroin>,N,"teksti"` teksti (kierto 0–3 = 0/90/180/270°),
`B<x>,<y>,0,<tyyppi>,<kapea>,<leveä>,<korkeus>,N,"data"` viivakoodi (tyyppi 1 = Code 128, 9 = Code 93, 3 = Code 39),
`X<x1>,<y1>,<paksuus>,<x2>,<y2>` kehys, `LO<x>,<y>,<w>,<h>` musta palkki, `GW<x>,<y>,<tavua/rivi>,<rivejä>,<bitit>` grafiikka
(bitti 0 = musta), `D<0–15>` tummuus, `I8,A,001` merkistö, `xa` AutoSense, `P<kpl>` tulosta. Lainausmerkit ja kenoviivat teksteissä
`\"` ja `\\`. Lähetys: `lp -d <jono> -o raw tiedosto.epl`.
- Älä käytä `R`-komentoa (viitesiirto): TLP3842:lla se sotki tulosteen (vain kehys tulostui). Siirrä koordinaatteja itse.
- 203 dpi:n piste on 0,125 mm, 300 dpi:n 0,085 mm: sama EPL eri tulostimella tulostuu 1,5-kertaisena tai 2/3-kokoisena.
- Tekstin katkaisu ennen QR:ää: merkkien määrä = (QR:n x − tekstin x) / fontin leveys. Mittaa kerran tarrasta, tulostin ei ilmoita ylivuodosta.

## Sudenkuopat

- **Suoralämpötulostimessa (GC420d, GK420d, LP-mallit) värinauhapaperi jää tyhjäksi**, vaikka tarra syöttyy ja jono näyttää valmista.
  Täysmusta testipalkki `D15` + `LO0,0,832,60` kertoo heti, tulostuuko mitään.
- **Fontti 5 pudottaa pienet kirjaimet** (esim. "450 g" → "450"). Yksiköt ja pienet kirjaimet fontilla 1–4.
- `lp` ilman `-o raw` toimii läpivienti-PPD:n kanssa, mutta GW-grafiikka (binääri) menee varmimmin `-o raw`:lla.
- Kun USB-kaapeli siirretään tulostimesta toiseen, vanha jono jää CUPSiin sarjanumerolla sidottuna ("The printer is offline"); työt
  jäävät jonoon ja tulostuvat kaikki kerralla, kun oikea tulostin on taas kiinni (`cancel -a <jono>` tyhjentää).
- Tarratulostin metallikuorineen varjostaa radioita: älä laita sitä 2,4 GHz:n gatewayn tai hubin päälle.
- `node` ei välttämättä ole launchd-/cron-ympäristön PATHissa; käytä täyttä polkua.
