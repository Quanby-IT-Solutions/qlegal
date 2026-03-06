"use client"

import { Card, CardContent } from "@/core/components/ui/card"

import { ParticipantView } from "./participant-view"

interface MeetingParticipantGridProps {
	participantIds: string[]
	presenterId: string | null
}

export function MeetingParticipantGrid({ participantIds, presenterId }: MeetingParticipantGridProps) {
	if (participantIds.length === 0) {
		return (
			<Card className="mx-auto max-w-xl shadow-md">
				<CardContent className="text-muted-foreground p-6 text-center text-sm">
					No participants yet. Turn on your camera to appear in the session.
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="flex h-full w-full flex-col gap-4 overflow-y-auto">
			{presenterId && (
				<div className="w-full">
					<div className="border-border/70 bg-card/80 overflow-hidden rounded-xl border shadow-lg">
						<ParticipantView participantId={presenterId} />
					</div>
				</div>
			)}
			<div className="grid h-full w-full auto-rows-[minmax(260px,1fr)] grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 sm:gap-5">
				{participantIds
					.filter(id => id !== presenterId)
					.map(participantId => (
						<div key={participantId} className="min-h-65">
							<ParticipantView participantId={participantId} />
						</div>
					))}
			</div>
		</div>
	)
}
