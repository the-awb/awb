import AppKit
import Foundation
func activate(_ pid: Int32) -> [String:Any] {
    guard let app = NSRunningApplication(processIdentifier:pid) else { return ["accepted":false,"active":false,"pid":pid] }
    let ok = app.activate(options:[.activateIgnoringOtherApps])
    RunLoop.current.run(until:Date(timeIntervalSinceNow:0.05))
    return ["accepted":ok,"active":app.isActive,"pid":pid]
}
func emit(_ value: Any) {
    let data = try! JSONSerialization.data(withJSONObject:value)
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data([10]))
}
let args=CommandLine.arguments
if args.count<2 || args[1]=="list" {
    emit(NSWorkspace.shared.runningApplications.filter{$0.activationPolicy == .regular}.map{["pid":$0.processIdentifier,"name":$0.localizedName ?? "","bundle":$0.bundleIdentifier ?? "","active":$0.isActive] as [String:Any]})
} else if args[1]=="persistent" {
    while let line=readLine() { if let pid=Int32(line) { emit(activate(pid)) } }
} else if let pid=Int32(args[1]) {
    let result=activate(pid); emit(result); exit(result["active"] as? Bool == true ? 0:1)
} else { exit(2) }
