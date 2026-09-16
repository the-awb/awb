import Foundation
import CoreAudio
import CAudioRing

struct DeviceDescription: Codable {
    let id: UInt32
    let uid: String
    let name: String
    let inputChannels: UInt32
    let nominalSampleRate: Double
    let isDefaultInput: Bool
}

enum HelperError: Error, CustomStringConvertible {
    case message(String)
    var description: String { if case let .message(value) = self { return value }; return "Native audio error" }
}

func propertySize(_ object: AudioObjectID, _ address: inout AudioObjectPropertyAddress) throws -> UInt32 {
    var size: UInt32 = 0
    let status = AudioObjectGetPropertyDataSize(object, &address, 0, nil, &size)
    guard status == noErr else { throw HelperError.message("Core Audio property size failed: \(status)") }
    return size
}

func propertyValue<T>(_ object: AudioObjectID, _ address: inout AudioObjectPropertyAddress, as: T.Type) throws -> T {
    var size = UInt32(MemoryLayout<T>.size)
    let pointer = UnsafeMutableRawPointer.allocate(byteCount: Int(size), alignment: MemoryLayout<T>.alignment)
    defer { pointer.deallocate() }
    let status = AudioObjectGetPropertyData(object, &address, 0, nil, &size, pointer)
    guard status == noErr else { throw HelperError.message("Core Audio property read failed: \(status)") }
    return pointer.load(as: T.self)
}

func stringProperty(_ object: AudioObjectID, selector: AudioObjectPropertySelector) throws -> String {
    var address = AudioObjectPropertyAddress(mSelector: selector, mScope: kAudioObjectPropertyScopeGlobal,
                                             mElement: kAudioObjectPropertyElementMain)
    let value: Unmanaged<CFString> = try propertyValue(object, &address, as: Unmanaged<CFString>.self)
    return value.takeUnretainedValue() as String
}

func inputChannelCount(_ device: AudioDeviceID) throws -> UInt32 {
    var address = AudioObjectPropertyAddress(mSelector: kAudioDevicePropertyStreamConfiguration,
                                             mScope: kAudioDevicePropertyScopeInput,
                                             mElement: kAudioObjectPropertyElementMain)
    let size = try propertySize(device, &address)
    let pointer = UnsafeMutableRawPointer.allocate(byteCount: Int(size), alignment: MemoryLayout<AudioBufferList>.alignment)
    defer { pointer.deallocate() }
    var mutableSize = size
    let status = AudioObjectGetPropertyData(device, &address, 0, nil, &mutableSize, pointer)
    guard status == noErr else { throw HelperError.message("Cannot read device channel layout: \(status)") }
    let list = UnsafeMutableAudioBufferListPointer(pointer.assumingMemoryBound(to: AudioBufferList.self))
    return list.reduce(0) { $0 + $1.mNumberChannels }
}

func devices() throws -> [DeviceDescription] {
    var address = AudioObjectPropertyAddress(mSelector: kAudioHardwarePropertyDevices,
                                             mScope: kAudioObjectPropertyScopeGlobal,
                                             mElement: kAudioObjectPropertyElementMain)
    let size = try propertySize(AudioObjectID(kAudioObjectSystemObject), &address)
    var ids = Array(repeating: AudioDeviceID(0), count: Int(size) / MemoryLayout<AudioDeviceID>.size)
    var mutableSize = size
    let status = ids.withUnsafeMutableBytes {
        AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &mutableSize, $0.baseAddress!)
    }
    guard status == noErr else { throw HelperError.message("Cannot enumerate Core Audio devices: \(status)") }
    var defaultAddress = AudioObjectPropertyAddress(mSelector: kAudioHardwarePropertyDefaultInputDevice,
                                                    mScope: kAudioObjectPropertyScopeGlobal,
                                                    mElement: kAudioObjectPropertyElementMain)
    let defaultInput: AudioDeviceID = try propertyValue(AudioObjectID(kAudioObjectSystemObject), &defaultAddress, as: AudioDeviceID.self)
    return try ids.compactMap { device in
        let channelCount = try inputChannelCount(device)
        guard channelCount > 0 else { return nil }
        var rateAddress = AudioObjectPropertyAddress(mSelector: kAudioDevicePropertyNominalSampleRate,
                                                     mScope: kAudioObjectPropertyScopeGlobal,
                                                     mElement: kAudioObjectPropertyElementMain)
        let rate: Float64 = try propertyValue(device, &rateAddress, as: Float64.self)
        return DeviceDescription(id: device,
                                 uid: try stringProperty(device, selector: kAudioDevicePropertyDeviceUID),
                                 name: try stringProperty(device, selector: kAudioObjectPropertyName),
                                 inputChannels: channelCount, nominalSampleRate: rate, isDefaultInput: device == defaultInput)
    }.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
}

func argument(_ name: String) -> String? {
    guard let index = CommandLine.arguments.firstIndex(of: name), index + 1 < CommandLine.arguments.count else { return nil }
    return CommandLine.arguments[index + 1]
}

final class CaptureContext {
    let ring: OpaquePointer
    init(channels: UInt32, frames: UInt32, sampleRate: Double) throws {
        guard let created = awb_audio_ring_create(16, channels, frames, sampleRate) else {
            throw HelperError.message("Cannot allocate the native audio ring buffer.")
        }
        ring = created
    }
    deinit { awb_audio_ring_destroy(ring) }
}

nonisolated(unsafe) let audioCallback: AudioDeviceIOProc = { _, now, inputData, inputTime, _, _, contextPointer in
    guard let contextPointer else { return noErr }
    let context = Unmanaged<CaptureContext>.fromOpaque(contextPointer).takeUnretainedValue()
    let hostTime = inputTime.pointee.mHostTime != 0 ? inputTime.pointee.mHostTime : now.pointee.mHostTime
    var frames: UInt32 = 0
    let list = UnsafeMutableAudioBufferListPointer(UnsafeMutablePointer(mutating: inputData))
    if let first = list.first, first.mNumberChannels > 0 {
        frames = first.mDataByteSize / (first.mNumberChannels * UInt32(MemoryLayout<Float>.size))
    }
    _ = awb_audio_ring_write(context.ring, inputData, frames, hostTime)
    return noErr
}

func streamDevice() throws -> Never {
    guard let uid = argument("--device-uid") else { throw HelperError.message("stream requires --device-uid") }
    let frameLimit = UInt32(argument("--frames-per-chunk") ?? "512") ?? 512
    guard let selected = try devices().first(where: { $0.uid == uid }) else { throw HelperError.message("Core Audio device not found: \(uid)") }
    var formatAddress = AudioObjectPropertyAddress(mSelector: kAudioDevicePropertyStreamFormat,
                                                   mScope: kAudioDevicePropertyScopeInput,
                                                   mElement: kAudioObjectPropertyElementMain)
    let format: AudioStreamBasicDescription = try propertyValue(selected.id, &formatAddress, as: AudioStreamBasicDescription.self)
    guard format.mFormatID == kAudioFormatLinearPCM,
          format.mBitsPerChannel == 32,
          (format.mFormatFlags & kAudioFormatFlagIsFloat) != 0 else {
        throw HelperError.message("The selected device does not expose Float32 PCM input.")
    }
    var bufferAddress = AudioObjectPropertyAddress(mSelector: kAudioDevicePropertyBufferFrameSize,
                                                   mScope: kAudioObjectPropertyScopeGlobal,
                                                   mElement: kAudioObjectPropertyElementMain)
    let actualFrames: UInt32 = try propertyValue(selected.id, &bufferAddress, as: UInt32.self)
    guard actualFrames <= frameLimit else {
        throw HelperError.message("Device buffer size \(actualFrames) exceeds configured maximum \(frameLimit).")
    }
    let context = try CaptureContext(channels: selected.inputChannels, frames: frameLimit, sampleRate: selected.nominalSampleRate)
    let retained = Unmanaged.passRetained(context)
    defer { retained.release() }
    var ioProc: AudioDeviceIOProcID?
    var status = AudioDeviceCreateIOProcID(selected.id, audioCallback, retained.toOpaque(), &ioProc)
    guard status == noErr, let ioProc else { throw HelperError.message("Cannot create Core Audio IO callback: \(status)") }
    defer { AudioDeviceDestroyIOProcID(selected.id, ioProc) }
    status = AudioDeviceStart(selected.id, ioProc)
    guard status == noErr else { throw HelperError.message("Cannot start Core Audio device: \(status)") }
    defer { AudioDeviceStop(selected.id, ioProc) }
    let ready = [ "type": "ready", "deviceUID": selected.uid, "deviceName": selected.name,
                  "sampleRate": selected.nominalSampleRate, "channelCount": selected.inputChannels,
                  "framesPerChunk": actualFrames ] as [String : Any]
    let readyData = try JSONSerialization.data(withJSONObject: ready)
    FileHandle.standardError.write(readyData); FileHandle.standardError.write(Data([0x0a]))
    while true {
        var byteCount: UInt32 = 0
        if let pointer = awb_audio_ring_read_pointer(context.ring, &byteCount) {
            FileHandle.standardOutput.write(Data(bytes: pointer, count: Int(byteCount)))
            awb_audio_ring_advance(context.ring)
        } else { usleep(1000) }
    }
}

do {
    guard CommandLine.arguments.count >= 2 else { throw HelperError.message("Usage: awb-audio-helper devices --json | stream --device-uid UID") }
    switch CommandLine.arguments[1] {
    case "devices":
        let data = try JSONEncoder().encode(devices())
        FileHandle.standardOutput.write(data); FileHandle.standardOutput.write(Data([0x0a]))
    case "stream": try streamDevice()
    default: throw HelperError.message("Unknown command: \(CommandLine.arguments[1])")
    }
} catch {
    let message = [ "type": "error", "message": String(describing: error) ]
    if let data = try? JSONSerialization.data(withJSONObject: message) {
        FileHandle.standardError.write(data); FileHandle.standardError.write(Data([0x0a]))
    }
    exit(1)
}
