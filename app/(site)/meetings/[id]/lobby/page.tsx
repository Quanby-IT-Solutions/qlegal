import { redirect } from "next/navigation"

interface MeetingLobbyPageProps {
	params: {
		id: string
	}
}

export default function MeetingLobbyPage({ params }: MeetingLobbyPageProps) {
	redirect(`/sessions/${params.id}`)
}
