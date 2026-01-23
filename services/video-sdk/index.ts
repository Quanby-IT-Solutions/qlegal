import { createHmac } from "crypto"

import { env } from "@/env"

const VIDEOSDK_API_BASE = "https://api.videosdk.live/v2"

// Generate VideoSDK JWT token
export function generateVideoSDKToken(): string {
	const apiKey = env.VIDEO_SDK_API_KEY
	const apiSecret = env.VIDEO_SDK_SECRET

	if (!apiKey || !apiSecret) {
		throw new Error("Video SDK credentials not configured")
	}

	// Generate token with 24 hour expiry
	const expiry = Math.floor(Date.now() / 1000) + 24 * 60 * 60

	const payload = {
		apikey: apiKey,
		permissions: ["allow_join", "allow_mod"],
		version: 2,
		roles: ["CRAWLER", "RTMP"],
		exp: expiry,
	}

	const header = {
		alg: "HS256",
		typ: "JWT",
		version: "2",
	}

	// Create JWT token
	const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url")
	const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url")

	const signature = createHmac("sha256", apiSecret)
		.update(`${encodedHeader}.${encodedPayload}`)
		.digest("base64url")

	return `${encodedHeader}.${encodedPayload}.${signature}`
}

// Create a new meeting room
export async function createMeetingRoom(): Promise<{ roomId: string }> {
	const token = generateVideoSDKToken()

	const response = await fetch(`${VIDEOSDK_API_BASE}/rooms`, {
		method: "POST",
		headers: {
			"authorization": token,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({}),
	})

	if (!response.ok) {
		throw new Error("Failed to create meeting room")
	}

	const data = (await response.json()) as { roomId: string }
	return { roomId: data.roomId }
}

// Generate token for joining a meeting
export function generateMeetingToken(): string {
	return generateVideoSDKToken()
}

// Validate a room
export async function validateRoom(roomId: string): Promise<boolean> {
	const token = generateVideoSDKToken()

	try {
		const response = await fetch(`${VIDEOSDK_API_BASE}/rooms/validate/${roomId}`, {
			method: "GET",
			headers: {
				authorization: token,
			},
		})
		return response.ok
	} catch {
		return false
	}
}

export interface VideoSDKRecording {
	id: string
	roomId: string
	sessionId?: string
	createdAt?: string
	updatedAt?: string
	fileId?: string
	file?: {
		id?: string
		fileUrl: string
		filePath?: string
		size?: number
		type?: string
		meta?: {
			resolution?: { width?: number; height?: number }
			format?: string
			duration?: number
		}
		createdAt?: string
		updatedAt?: string
	}
}

interface FetchRecordingsResponse {
	pageInfo?: {
		currentPage: number
		perPage: number
		lastPage: number
		total: number
	}
	data: VideoSDKRecording[]
}

/** Fetch VideoSDK cloud recordings for a room (v2 API). */
export async function fetchRecordings(roomId: string): Promise<VideoSDKRecording[]> {
	const token = generateVideoSDKToken()
	const url = new URL(`${VIDEOSDK_API_BASE}/recordings`)
	url.searchParams.set("roomId", roomId)

	const response = await fetch(url.toString(), {
		method: "GET",
		headers: {
			authorization: token,
			"Content-Type": "application/json",
		},
	})

	if (!response.ok) {
		throw new Error("Failed to fetch recordings")
	}

	const body = (await response.json()) as FetchRecordingsResponse
	const list = Array.isArray(body?.data) ? body.data : []
	return list
}
