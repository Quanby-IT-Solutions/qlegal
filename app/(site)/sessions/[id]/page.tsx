"use client"

import { use, useState } from "react"

import { SessionLobby } from "@/features/sessions/components/session-lobby"
import { SessionRoom } from "@/features/sessions/components/session-room"

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params)
	const [view, setView] = useState<"lobby" | "room">("lobby")

	if (view === "lobby") {
		return <SessionLobby id={id} onJoin={() => setView("room")} />
	}

	return <SessionRoom id={id} onLeave={() => setView("lobby")} />
}
