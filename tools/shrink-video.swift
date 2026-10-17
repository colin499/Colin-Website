// Makes a web-sized copy of a video: H.264 .mp4, at most MAX_W pixels wide,
// at a modest bitrate, with the sound kept. Used by build.js.
// Usage: shrink-video <input> <output.mp4> [start seconds] [end seconds]
import AVFoundation
import Foundation

let MAX_W: CGFloat = 1600
let VIDEO_BITRATE = 2_500_000

let args = CommandLine.arguments
guard args.count >= 3 else { print("usage: shrink-video <input> <output.mp4> [start] [end]"); exit(2) }
let src = URL(fileURLWithPath: args[1])
let dst = URL(fileURLWithPath: args[2])
try? FileManager.default.removeItem(at: dst)

let asset = AVURLAsset(url: src)
let sem = DispatchSemaphore(value: 0)
var failed = false

func fail(_ msg: String) -> Never { FileHandle.standardError.write((msg + "\n").data(using: .utf8)!); exit(1) }

guard let vTrack = asset.tracks(withMediaType: .video).first else { fail("no video track") }
let aTrack = asset.tracks(withMediaType: .audio).first

// Size after rotation, scaled to fit MAX_W, rounded to even numbers.
let natural = vTrack.naturalSize.applying(vTrack.preferredTransform)
let w0 = abs(natural.width), h0 = abs(natural.height)
let scale = min(1, MAX_W / w0)
let outW = Int((w0 * scale / 2).rounded()) * 2
let outH = Int((h0 * scale / 2).rounded()) * 2

// Optional trim: keep only the part between start and end (in seconds).
let startSec = args.count > 3 ? max(0, Double(args[3]) ?? 0) : 0
let endSec = args.count > 4 ? min(asset.duration.seconds, Double(args[4]) ?? asset.duration.seconds) : asset.duration.seconds
guard endSec > startSec else { fail("the end of the trim comes before its start") }
let trimStart = CMTime(seconds: startSec, preferredTimescale: 600)
let trimRange = CMTimeRange(start: trimStart, end: CMTime(seconds: endSec, preferredTimescale: 600))

let reader = try! AVAssetReader(asset: asset)
reader.timeRange = trimRange
let writer = try! AVAssetWriter(outputURL: dst, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true

// Video: let a composition handle rotation and scaling.
let comp = AVMutableVideoComposition(propertiesOf: asset)
comp.renderSize = CGSize(width: outW, height: outH)
let fps = vTrack.nominalFrameRate > 0 ? min(vTrack.nominalFrameRate, 30) : 30
comp.frameDuration = CMTime(value: 1, timescale: CMTimeScale(fps.rounded()))
let instr = AVMutableVideoCompositionInstruction()
instr.timeRange = CMTimeRange(start: .zero, duration: asset.duration)
let layer = AVMutableVideoCompositionLayerInstruction(assetTrack: vTrack)
var t = vTrack.preferredTransform
let rotated = vTrack.naturalSize.applying(t)
t = t.concatenating(CGAffineTransform(translationX: rotated.width < 0 ? -rotated.width : 0, y: rotated.height < 0 ? -rotated.height : 0))
layer.setTransform(t.concatenating(CGAffineTransform(scaleX: scale, y: scale)), at: .zero)
instr.layerInstructions = [layer]
comp.instructions = [instr]

let vOut = AVAssetReaderVideoCompositionOutput(videoTracks: [vTrack], videoSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
vOut.videoComposition = comp
reader.add(vOut)
let vIn = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: outW,
    AVVideoHeightKey: outH,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: VIDEO_BITRATE,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        AVVideoMaxKeyFrameIntervalKey: 60,
    ],
])
vIn.expectsMediaDataInRealTime = false
writer.add(vIn)

var aOut: AVAssetReaderTrackOutput? = nil
var aIn: AVAssetWriterInput? = nil
if let aTrack = aTrack {
    let o = AVAssetReaderTrackOutput(track: aTrack, outputSettings: [AVFormatIDKey: kAudioFormatLinearPCM])
    reader.add(o); aOut = o
    let i = AVAssetWriterInput(mediaType: .audio, outputSettings: [
        AVFormatIDKey: kAudioFormatMPEG4AAC, AVNumberOfChannelsKey: 2, AVSampleRateKey: 44100, AVEncoderBitRateKey: 128_000,
    ])
    writer.add(i); aIn = i
}

guard reader.startReading() else { fail("can't read: \(reader.error?.localizedDescription ?? "")") }
writer.startWriting()
writer.startSession(atSourceTime: trimStart)

let group = DispatchGroup()
func pump(_ input: AVAssetWriterInput, _ output: AVAssetReaderOutput, _ label: String) {
    group.enter()
    input.requestMediaDataWhenReady(on: DispatchQueue(label: label)) {
        while input.isReadyForMoreMediaData {
            if let buf = output.copyNextSampleBuffer() {
                if !input.append(buf) { failed = true; input.markAsFinished(); group.leave(); return }
            } else { input.markAsFinished(); group.leave(); return }
        }
    }
}
pump(vIn, vOut, "video")
if let aIn = aIn, let aOut = aOut { pump(aIn, aOut, "audio") }
group.notify(queue: .main) {
    writer.finishWriting { sem.signal() }
}
DispatchQueue.global().async { sem.wait(); 
    if failed || writer.status != .completed { fail("failed: \(writer.error?.localizedDescription ?? reader.error?.localizedDescription ?? "")") }
    exit(0)
}
dispatchMain()
