// QR-matriisi macOS:n CoreImagella (CIQRCodeGenerator), tulostus riveittäin 0/1 (1 = musta moduuli): qr <teksti> [L|M|Q|H]
import CoreImage
import Foundation
let teksti = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "HOMEROS"
let taso = CommandLine.arguments.count > 2 ? CommandLine.arguments[2] : "M"
let f = CIFilter(name: "CIQRCodeGenerator")!
f.setValue(teksti.data(using: .utf8), forKey: "inputMessage")
f.setValue(taso, forKey: "inputCorrectionLevel")
let kuva = f.outputImage!
let w = Int(kuva.extent.width), h = Int(kuva.extent.height)
var pikselit = [UInt8](repeating: 0, count: w * h * 4)
CIContext().render(kuva, toBitmap: &pikselit, rowBytes: w * 4, bounds: kuva.extent, format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())
for y in 0..<h { print((0..<w).map { pikselit[(y * w + $0) * 4] < 128 ? "1" : "0" }.joined()) }
