# zebra-tarra

Print labels on old Zebra EPL2 label printers (TLP3842, TLP2844, GC420d, GK420d …) from macOS, with no vendor driver:
a pass-through CUPS PPD, a dependency-free `tarra.js` that lays out text, Code 93/128 barcodes and QR codes in **millimetres**
(so the same command works on 203 and 300 dpi printers), and a calibration label that tells you where your label stock actually
sits under the print head. The whole folder doubles as a [Claude Code](https://claude.com/claude-code) skill: copy it to
`~/.claude/skills/zebra/` and Claude knows how to set up the printer and print.

The documentation (`SKILL.md`) is in Finnish; the tool's options are short enough to follow with the examples below.

```bash
lpadmin -p zebra -E -v 'usb://Zebra/TLP3842?serial=XXXX' -P zebra-epl.ppd -o printer-is-shared=false   # once per printer
node tarra.js "sensor B" A6C380 --jono zebra --dpi 300            # text + Code 93 on a small label
node tarra.js "LV0003 gateway" --koko iso --qr "SLV0003 1PLV" --dpi 300   # 51 × 25 mm with QR (needs Xcode CLT once for qr.swift)
node tarra.js --kalibrointi --dpi 203 --leveys 104                # frame + mm scale to measure label position
node tarra.js "text" --nayta                                      # show the EPL instead of printing
```

Hard-won notes inside: direct-thermal printers print nothing on thermal-transfer stock, EPL font 5 is uppercase-only,
run AutoSense (`xa`) after every roll change, avoid the `R` command, QR codes must be sent as `GW` bitmaps on old firmware.

## Suomeksi

Paketti Zebra-tarrakirjoittimille (EPL2) Macilla: läpivienti-PPD CUPSiin, `tarra.js` millimetrimitoin (203 ja 300 dpi), QR
CoreImagella, kalibrointitarra rullan paikan mittaukseen ja `SKILL.md`, joka on samalla Claude Code -skilli. Käyttöönotto ja
sudenkuopat on kirjattu SKILL.md:hen.

Lisenssi MIT.
