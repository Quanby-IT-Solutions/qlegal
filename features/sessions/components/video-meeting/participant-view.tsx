"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { useParticipant } from "@videosdk.live/react-sdk"
import { Mic, MicOff } from "lucide-react"

import { Card, CardContent } from "@/core/components/ui/card"
import { cn } from "@/core/lib/utils"

interface ParticipantViewProps {
	participantId: string
}

export const ParticipantView = React.memo(function ParticipantView({
	participantId,
}: ParticipantViewProps) {
	const { webcamStream, displayName, isLocal, micOn, screenShareStream, screenShareOn, micStream } =
		useParticipant(participantId)
	const videoRef = useRef<HTMLVideoElement>(null)
	const audioRef = useRef<HTMLAudioElement>(null)
	const [hasTrack, setHasTrack] = useState(false)

	const getMediaStream = useMemo(() => {
		return (streamObj: unknown): MediaStream | null => {
			if (!streamObj) return null
			if (streamObj instanceof MediaStream) return streamObj
			if ((streamObj as { track?: MediaStreamTrack })?.track instanceof MediaStreamTrack) {
				return new MediaStream([(streamObj as { track: MediaStreamTrack }).track])
			}
			if ((streamObj as { stream?: MediaStream })?.stream instanceof MediaStream) {
				return (streamObj as { stream: MediaStream }).stream
			}
			if ((streamObj as { mediaStream?: MediaStream })?.mediaStream instanceof MediaStream) {
				return (streamObj as { mediaStream: MediaStream }).mediaStream
			}
			if (
				typeof (streamObj as { getTracks?: () => MediaStreamTrack[] })?.getTracks === "function"
			) {
				const tracks = (streamObj as { getTracks: () => MediaStreamTrack[] }).getTracks()
				if (tracks?.length) return new MediaStream(tracks)
			}
			if (
				typeof (streamObj as { getVideoTracks?: () => MediaStreamTrack[] })?.getVideoTracks ===
				"function"
			) {
				const vTracks = (streamObj as { getVideoTracks: () => MediaStreamTrack[] }).getVideoTracks()
				if (vTracks?.length) return new MediaStream(vTracks)
			}
			return null
		}
	}, [])

	useEffect(() => {
		const videoElement = videoRef.current
		if (!videoElement) return

		const isLiveVideoTrack = (track: MediaStreamTrack) =>
			track.kind === "video" && track.readyState === "live" && track.enabled

		const screenStream = getMediaStream(screenShareStream)
		const webcamMediaStream = getMediaStream(webcamStream)

		const screenHasLiveVideo =
			!!screenStream && screenStream.getVideoTracks().some(isLiveVideoTrack)
		const webcamHasLiveVideo =
			!!webcamMediaStream && webcamMediaStream.getVideoTracks().some(isLiveVideoTrack)

		const mediaStream = screenHasLiveVideo
			? screenStream
			: webcamHasLiveVideo
				? webcamMediaStream
				: null

		if (mediaStream && mediaStream.getVideoTracks().length > 0) {
			setHasTrack(true)
			videoElement.srcObject = mediaStream
			videoElement.play().catch(() => {
				// ignore autoplay errors
			})
		} else {
			setHasTrack(false)
			videoElement.srcObject = null
		}
	}, [webcamStream, screenShareStream, getMediaStream])

	useEffect(() => {
		const audioElement = audioRef.current
		if (!audioElement || isLocal) return

		const getAudioStream = (streamObj: unknown): MediaStream | null => {
			if (!streamObj) return null
			if (streamObj instanceof MediaStream) {
				const audioTracks = streamObj.getAudioTracks()
				if (audioTracks.length > 0) return new MediaStream(audioTracks)
				return null
			}
			if ((streamObj as { stream?: MediaStream })?.stream instanceof MediaStream) {
				const stream = (streamObj as { stream: MediaStream }).stream
				const audioTracks = stream.getAudioTracks()
				if (audioTracks.length > 0) return new MediaStream(audioTracks)
			}
			if ((streamObj as { mediaStream?: MediaStream })?.mediaStream instanceof MediaStream) {
				const stream = (streamObj as { mediaStream: MediaStream }).mediaStream
				const audioTracks = stream.getAudioTracks()
				if (audioTracks.length > 0) return new MediaStream(audioTracks)
			}
			if ((streamObj as { track?: MediaStreamTrack })?.track instanceof MediaStreamTrack) {
				const track = (streamObj as { track: MediaStreamTrack }).track
				if (track.kind === "audio") return new MediaStream([track])
			}
			if (
				typeof (streamObj as { getTracks?: () => MediaStreamTrack[] })?.getTracks === "function"
			) {
				const tracks = (streamObj as { getTracks: () => MediaStreamTrack[] }).getTracks()
				const audioTracks = tracks.filter(t => t.kind === "audio")
				if (audioTracks.length > 0) return new MediaStream(audioTracks)
			}
			if (
				typeof (streamObj as { getAudioTracks?: () => MediaStreamTrack[] })?.getAudioTracks ===
				"function"
			) {
				const aTracks = (streamObj as { getAudioTracks: () => MediaStreamTrack[] }).getAudioTracks()
				if (aTracks.length > 0) return new MediaStream(aTracks)
			}
			return null
		}

		let audioStream = getAudioStream(micStream)
		if (!audioStream && webcamStream) {
			audioStream = getAudioStream(webcamStream)
		}

		if (audioStream && audioStream.getAudioTracks().length > 0 && micOn) {
			const enabledTracks = audioStream
				.getAudioTracks()
				.filter(track => track.enabled && track.readyState === "live")

			if (enabledTracks.length > 0) {
				const enabledStream = new MediaStream(enabledTracks)
				audioElement.srcObject = enabledStream
				audioElement.volume = 1.0
				audioElement.play().catch(() => {
					// ignore autoplay errors
				})
			} else {
				audioElement.srcObject = null
			}
		} else {
			audioElement.srcObject = null
		}
	}, [micStream, webcamStream, micOn, isLocal])

	const initials = displayName?.charAt(0).toUpperCase() ?? "?"
	const isPresenting = !!screenShareOn
	const showVideo = hasTrack

	return (
		<Card className="border-border/70 bg-card/80 relative size-full overflow-hidden rounded-xl border shadow-lg backdrop-blur-sm">
			<CardContent className="from-muted/40 via-background to-muted/60 relative size-full bg-linear-to-br p-0">
				<video
					ref={videoRef}
					autoPlay
					playsInline
					muted={isLocal}
					className={cn(
						"bg-muted/30 size-full transition-opacity duration-200",
						isPresenting ? "object-contain" : "object-cover",
						"aspect-4/3 md:aspect-16/10",
						!showVideo && "opacity-0"
					)}
				/>

				{!isLocal && <audio ref={audioRef} autoPlay playsInline className="hidden" />}

				{!showVideo && !isPresenting && (
					<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
						<div className="bg-primary text-primary-foreground flex size-16 items-center justify-center rounded-full text-2xl font-semibold shadow-lg md:size-20">
							{initials}
						</div>
					</div>
				)}

				<div className="absolute right-2 bottom-2 left-2 flex items-center justify-between rounded-lg bg-linear-to-r from-black/80 via-black/70 to-black/60 px-2.5 py-1.5 text-[11px] text-white shadow-md">
					<div className="flex items-center gap-1">
						<span className="max-w-35 truncate font-semibold">{displayName ?? "Guest"}</span>
						{isLocal && <span className="text-[10px] text-white/80">(You)</span>}
						{isPresenting && (
							<span className="ml-1 rounded-full bg-emerald-900/60 px-1.5 py-0.5 text-[10px] text-emerald-200">
								Presenting
							</span>
						)}
					</div>
					<div className="flex items-center gap-1.5">
						{micOn ? (
							<Mic className="size-3.5 text-green-400" />
						) : (
							<MicOff className="size-3.5 text-red-400" />
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	)
})
