"use client"

import { useEffect, useState } from "react"
import { Calendar, FileText } from "lucide-react"
import { toast } from "sonner"

// import { useSession } from "next-auth/react"

import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle
} from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "@/core/components/ui/select"
import { Textarea } from "@/core/components/ui/textarea"

import { trpc } from "@/services/trpc/client"

import { ParticipantSelector } from "@/features/messages/components/participant-selector"

interface EnvelopeUser {
	id: string
	name: string | null
	email: string | null
}

interface DocumentRecipient {
	id: string
	role: string
	status: string
	userId: string | null
	user: EnvelopeUser | null
}

interface EnvelopeDocument {
	id: string
	name: string
	url: string
	recipients: DocumentRecipient[]
}

interface EnvelopeData {
	id: string
	title: string
	description: string | null
	status: string
	createdAt: Date | string
	createdBy: EnvelopeUser | null
	documents: EnvelopeDocument[]
}

interface ScheduleMeetingDialogProps {
	envelope: EnvelopeData | null
	open: boolean
	onOpenChange: (open: boolean) => void
	onSuccess?: () => void
}

export function ScheduleMeetingDialog({
	envelope,
	open,
	onOpenChange,
	onSuccess
}: ScheduleMeetingDialogProps) {
	const [sessionDetails, setSessionDetails] = useState({
		title: "",
		document: "",
		date: "",
		time: "",
		notes: ""
	})

	const [selectedParticipants, setSelectedParticipants] = useState<
		Array<{
			id: string
			name: string | null
			email: string | null
			image: string | null
			role: string
			organization: string | null
		}>
	>([])

	// Pre-fill form when envelope changes
	useEffect(() => {
		if (envelope && open) {
			// Pre-fill with envelope details
			setSessionDetails({
				title: `Signing Session - ${envelope.title}`,
				document: envelope.documents?.[0]?.name ?? "",
				date: "",
				time: "",
				notes: envelope.description ?? ""
			})

			// Pre-select all envelope participants (including envelope creator and document recipients)
			const documentRecipients =
				envelope.documents
					?.flatMap((doc) => doc.recipients)
					?.filter((recipient) => recipient.user)
					?.map((recipient) => ({
						id: recipient.user!.id,
						name: recipient.user!.name,
						email: recipient.user!.email,
						image: null,
						role: recipient.role,
						organization: null
					})) ?? []

			// Include envelope creator if they exist and aren't already in the list
			const envelopeCreator = envelope.createdBy
				? {
						id: envelope.createdBy.id,
						name: envelope.createdBy.name,
						email: envelope.createdBy.email,
						image: null,
						role: "CREATOR",
						organization: null
					}
				: null

			// Combine and remove duplicates
			const allParticipants = [...documentRecipients]
			if (
				envelopeCreator &&
				!allParticipants.find((p) => p.id === envelopeCreator.id)
			) {
				allParticipants.push(envelopeCreator)
			}

			const envelopeParticipants = allParticipants

			setSelectedParticipants(envelopeParticipants)
		}
	}, [envelope, open])

	// Meeting creation mutation
	const createMeetingMutation = trpc.meetings.createMeeting.useMutation({
		onSuccess: () => {
			toast.success("Meeting scheduled successfully!")
			onOpenChange(false)
			setSessionDetails({
				title: "",
				document: "",
				date: "",
				time: "",
				notes: ""
			})
			setSelectedParticipants([])
			onSuccess?.()
		},
		onError: (error) => {
			toast.error("Failed to schedule meeting: " + error.message)
		}
	})

	const handleCreateSession = () => {
		if (!sessionDetails.title || !sessionDetails.date || !sessionDetails.time) {
			toast.error("Please fill in all required fields")
			return
		}

		if (selectedParticipants.length === 0) {
			toast.error("Please select at least one participant")
			return
		}

		// Create the meeting using the API
		createMeetingMutation.mutate({
			title: sessionDetails.title,
			description: sessionDetails.notes || undefined,
			date: sessionDetails.date,
			time: sessionDetails.time,
			duration: 60, // Default 60 minutes
			type: "VIDEO" as const, // Default to video
			document: sessionDetails.document || undefined,
			notes: sessionDetails.notes || undefined,
			participantIds: selectedParticipants.map((p) => p.id)
		})
	}

	const handleClose = () => {
		setSessionDetails({
			title: "",
			document: "",
			date: "",
			time: "",
			notes: ""
		})
		setSelectedParticipants([])
		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="max-w-4xl border-0 bg-white/95 shadow-2xl backdrop-blur-sm">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-slate-900">
						<div className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 p-2">
							<Calendar className="h-5 w-5 text-white" />
						</div>
						Schedule Signing Session
					</DialogTitle>
					<DialogDescription className="text-slate-600">
						{envelope
							? `Create a signing session for "${envelope.title}"`
							: "Create a new remote signing session with participants"}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Envelope Info Card */}
					{envelope && (
						<Card className="border border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 shadow-sm">
							<CardHeader className="pb-3">
								<CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
									<FileText className="h-4 w-4 text-blue-600" />
									Envelope Details
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								<div className="flex items-center gap-2 text-sm">
									<span className="font-medium text-slate-700">Title:</span>
									<span className="text-slate-600">{envelope.title}</span>
								</div>
								{envelope.description && (
									<div className="flex items-start gap-2 text-sm">
										<span className="font-medium text-slate-700">
											Description:
										</span>
										<span className="italic text-slate-600">
											&ldquo;{envelope.description}&rdquo;
										</span>
									</div>
								)}
								<div className="flex items-center gap-2 text-sm">
									<span className="font-medium text-slate-700">
										Participants:
									</span>
									<span className="text-slate-600">
										{(() => {
											const documentRecipients =
												envelope.documents?.flatMap((doc) => doc.recipients) ??
												[]
											const hasCreator = !!envelope.createdBy
											const totalCount =
												documentRecipients.length + (hasCreator ? 1 : 0)
											return `${totalCount} participant(s)`
										})()}
									</span>
								</div>
								<div className="space-y-2">
									<div className="flex items-center gap-2 text-sm">
										<span className="font-medium text-slate-700">
											Documents:
										</span>
										<span className="text-slate-600">
											{envelope.documents?.length ?? 0} document(s)
										</span>
									</div>
									{envelope.documents && envelope.documents.length > 0 && (
										<div className="mt-2 flex flex-wrap gap-3">
											{envelope.documents.map((doc) => (
												<div
													key={doc.id}
													className="group flex min-w-[80px] cursor-default flex-col items-center rounded-lg p-3 transition-colors hover:bg-white/50"
													title={doc.name}
												>
													<div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-red-500 shadow-sm">
														<FileText className="h-6 w-6 text-white" />
													</div>
													<p className="w-full max-w-[80px] truncate text-center text-xs text-slate-700">
														{doc.name}
													</p>
												</div>
											))}
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					)}

					{/* Basic Info Row */}
					<div className="grid grid-cols-3 gap-4">
						<div className="space-y-2">
							<Label htmlFor="title" className="text-slate-700">
								Session Title
							</Label>
							<Input
								id="title"
								placeholder="Enter session title"
								value={sessionDetails.title}
								onChange={(e) =>
									setSessionDetails({
										...sessionDetails,
										title: e.target.value
									})
								}
								className="border-slate-200 bg-white/50"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="date" className="text-slate-700">
								Date
							</Label>
							<Input
								id="date"
								type="date"
								value={sessionDetails.date}
								onChange={(e) =>
									setSessionDetails({ ...sessionDetails, date: e.target.value })
								}
								className="border-slate-200 bg-white/50"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="time" className="text-slate-700">
								Time
							</Label>
							<Select
								value={sessionDetails.time}
								onValueChange={(value) =>
									setSessionDetails({ ...sessionDetails, time: value })
								}
							>
								<SelectTrigger className="border-slate-200 bg-white/50">
									<SelectValue placeholder="Select time" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="09:00">09:00 AM</SelectItem>
									<SelectItem value="09:30">09:30 AM</SelectItem>
									<SelectItem value="10:00">10:00 AM</SelectItem>
									<SelectItem value="10:30">10:30 AM</SelectItem>
									<SelectItem value="11:00">11:00 AM</SelectItem>
									<SelectItem value="11:30">11:30 AM</SelectItem>
									<SelectItem value="12:00">12:00 PM</SelectItem>
									<SelectItem value="12:30">12:30 PM</SelectItem>
									<SelectItem value="13:00">01:00 PM</SelectItem>
									<SelectItem value="13:30">01:30 PM</SelectItem>
									<SelectItem value="14:00">02:00 PM</SelectItem>
									<SelectItem value="14:30">02:30 PM</SelectItem>
									<SelectItem value="15:00">03:00 PM</SelectItem>
									<SelectItem value="15:30">03:30 PM</SelectItem>
									<SelectItem value="16:00">04:00 PM</SelectItem>
									<SelectItem value="16:30">04:30 PM</SelectItem>
									<SelectItem value="17:00">05:00 PM</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Participants & Notes Row */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label className="text-slate-700">Participants</Label>
							<ParticipantSelector
								selectedParticipants={selectedParticipants}
								onParticipantsChange={setSelectedParticipants}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="notes" className="text-slate-700">
								Session Notes
							</Label>
							<Textarea
								id="notes"
								placeholder="Add any additional notes or instructions"
								value={sessionDetails.notes}
								onChange={(e) =>
									setSessionDetails({
										...sessionDetails,
										notes: e.target.value
									})
								}
								rows={3}
								className="border-slate-200 bg-white/50"
							/>
						</div>
					</div>

					{/* Action Buttons */}
					<div className="flex justify-center gap-3 pt-4">
						<Button
							onClick={handleCreateSession}
							className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 text-white shadow-lg hover:from-blue-700 hover:to-purple-700"
							disabled={createMeetingMutation.isPending}
						>
							<Calendar className="mr-2 h-4 w-4" />
							{createMeetingMutation.isPending
								? "Creating..."
								: "Schedule Session"}
						</Button>
						<Button
							variant="outline"
							onClick={handleClose}
							className="border-slate-200 text-slate-700"
						>
							Cancel
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
