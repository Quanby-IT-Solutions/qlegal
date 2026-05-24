"use client"

import { Mail, Phone, User, X } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import { cn } from "@/core/lib/utils"

interface FileUploadPanelProps {
	conversationId: string
	participant?: {
		id: string
		name: string | null
		email: string | null
		image: string | null
		role?: string
		status?: "online" | "offline" | "away" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING"
		bio?: string | null
		joinedAt?: Date
	}
	onClose?: () => void
}

export function FileUploadPanel({
	conversationId: _conversationId,
	participant,
	onClose,
}: FileUploadPanelProps) {
	const displayParticipant = participant

	const getInitials = (name?: string | null) => {
		if (!name) return "?"
		const parts = name.split(" ")
		return parts
			.map(p => p[0])
			.join("")
			.toUpperCase()
	}

	const statusColor = {
		ACTIVE: "bg-green-500",
		INACTIVE: "bg-gray-500",
		SUSPENDED: "bg-yellow-500",
		PENDING: "bg-yellow-500",
		online: "bg-green-500",
		offline: "bg-gray-500",
		away: "bg-yellow-500",
	}[displayParticipant?.status ?? "INACTIVE"]

	return (
		<>
			<div className="bg-background flex h-screen w-full flex-col border-l sm:w-80">
				{/* Header */}
				<div className="flex shrink-0 items-center justify-between border-b p-4">
					<div>
						<h2 className="text-lg font-semibold">Chat Details</h2>
						<p className="text-muted-foreground text-xs">Participant information</p>
					</div>
					{onClose && (
						<Button variant="ghost" size="icon" onClick={onClose} className="sm:hidden">
							<X className="size-5" />
						</Button>
					)}
				</div>

				{/* Participant Details - Scrollable container */}
				<div className="flex-1 overflow-y-auto p-4">
					<div className="space-y-6">
						{/* Profile Card */}
						<Card className="p-6 text-center">
							<div className="flex flex-col items-center gap-4">
								<div className="relative">
									<Avatar className="ring-background size-24 shadow-lg ring-4">
										<AvatarImage
											src={displayParticipant?.image ?? undefined}
											alt={displayParticipant?.name ?? "User"}
										/>
										<AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
											{getInitials(displayParticipant?.name)}
										</AvatarFallback>
									</Avatar>
									<div
										className={cn(
											"border-background absolute -right-1 -bottom-1 size-4 rounded-full border-2 shadow-md",
											statusColor
										)}
									/>
								</div>
								<div>
									<h3 className="text-lg font-semibold">
										{displayParticipant?.name ?? "Unknown User"}
									</h3>
									{displayParticipant?.role && (
										<Badge variant="secondary" className="mt-2">
											{displayParticipant.role}
										</Badge>
									)}
								</div>
							</div>
						</Card>

						<Separator />

						{/* Contact Information */}
						<div className="space-y-3">
							<h4 className="text-sm font-semibold">Contact Information</h4>

							<div className="bg-muted/40 space-y-2 rounded-lg p-3">
								<div className="flex items-center gap-2">
									<Mail className="text-primary size-4 shrink-0" />
									<p className="text-muted-foreground text-xs font-medium">Email</p>
								</div>
								<p className="truncate text-sm">{displayParticipant?.email ?? "-"}</p>
							</div>

							<div className="bg-muted/40 space-y-2 rounded-lg p-3">
								<p className="text-muted-foreground text-xs font-medium">Role</p>
								<p className="text-sm">{displayParticipant?.role ?? "-"}</p>
							</div>

							<div className="bg-muted/40 space-y-2 rounded-lg p-3">
								<p className="text-muted-foreground text-xs font-medium">Joined Date</p>
								<p className="text-sm">
									{displayParticipant?.joinedAt
										? new Date(displayParticipant.joinedAt).toLocaleDateString("en-US", {
												year: "numeric",
												month: "long",
												day: "numeric",
											})
										: "-"}
								</p>
							</div>

							<div className="bg-muted/40 space-y-2 rounded-lg p-3">
								<p className="text-muted-foreground text-xs font-medium">Bio</p>
								<p className="text-sm leading-relaxed">
									{displayParticipant?.bio ?? "No bio provided"}
								</p>
							</div>
						</div>

						<Separator />

						{/* Actions */}
						<div className="space-y-3">
							<h4 className="text-sm font-semibold">Actions</h4>
							<div className="flex flex-col gap-2">
								<Button variant="outline" className="w-full justify-start gap-2">
									<Phone className="size-4" />
									Start Call
								</Button>
								<Button variant="outline" className="w-full justify-start gap-2">
									<User className="size-4" />
									View File
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	)
}
