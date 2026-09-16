// swift-tools-version: 6.1
import PackageDescription

let package = Package(
    name: "AWBAudioHelper",
    platforms: [ .macOS(.v13) ],
    products: [ .executable(name: "awb-audio-helper", targets: [ "AWBAudioHelper" ]) ],
    targets: [
        .target(name: "CAudioRing", path: "Sources/CAudioRing", publicHeadersPath: "include"),
        .executableTarget(name: "AWBAudioHelper", dependencies: [ "CAudioRing" ], path: "Sources/AWBAudioHelper")
    ]
)
