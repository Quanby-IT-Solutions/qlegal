import { redirect } from "next/navigation"

interface MeetingRoomPageProps {
	params: {
		id: string
	}
}

export default function MeetingRoomPage({ params }: MeetingRoomPageProps) {
	redirect(`/sessions/${params.id}`)
}
