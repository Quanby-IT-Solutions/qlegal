"use client"

import { CheckCircle, Clock, Handshake, Mail, MapPin, Phone, User, Video } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"

import type { EnhancedENP, WorkflowType } from "../types/find-notary.types"

interface NotaryDetailsProps {
	enp: EnhancedENP
	bookingWorkflow: WorkflowType
	onChangeNotary: () => void
}

export function NotaryDetails({ enp, bookingWorkflow, onChangeNotary }: NotaryDetailsProps) {
	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>Notary Details</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center gap-4">
						<Avatar className="h-16 w-16">
							<AvatarImage src={enp.image || undefined} alt={enp.name || "ENP"} />
							<AvatarFallback>
								{enp.name
									?.split(" ")
									.map(n => n[0])
									.join("") || "EN"}
							</AvatarFallback>
						</Avatar>
						<div>
							<h4 className="font-medium">{enp.name}</h4>
							<p className="text-muted-foreground text-sm">Electronic Notary Public</p>
							<div className="mt-1 flex items-center gap-1">
								<span className="text-sm font-medium">{enp.rating}</span>
								<span className="text-muted-foreground text-sm">({enp.reviewCount} reviews)</span>
							</div>
						</div>
					</div>

					<div className="space-y-3 text-sm">
						{enp.phoneNumber && (
							<div className="flex items-center gap-2">
								<Phone className="text-muted-foreground h-4 w-4" />
								<span>{enp.phoneNumber}</span>
							</div>
						)}
						{enp.email && (
							<div className="flex items-center gap-2">
								<Mail className="text-muted-foreground h-4 w-4" />
								<span>{enp.email}</span>
							</div>
						)}
						<div>
							<p className="font-medium">Specialization</p>
							<p className="text-muted-foreground">{enp.specialization}</p>
						</div>
						<div>
							<p className="font-medium">Languages</p>
							<p className="text-muted-foreground">{enp.languages.join(", ")}</p>
						</div>
						<div>
							<p className="font-medium">Experience</p>
							<p className="text-muted-foreground">{enp.experience}</p>
						</div>
						<div>
							<p className="font-medium">Response Time</p>
							<p className="text-muted-foreground">{enp.responseTime}</p>
						</div>
					</div>

					{/* Workflow Badge */}
					<div className="border-t pt-4">
						<p className="mb-2 text-sm font-medium">Selected Workflow</p>
						<Badge variant="outline" className="flex w-fit items-center gap-1">
							{bookingWorkflow === "REN" ? (
								<>
									<Video className="h-3 w-3" />
									Remote (REN)
								</>
							) : (
								<>
									<Handshake className="h-3 w-3" />
									In-Person (IEN)
								</>
							)}
						</Badge>
					</div>

					<Button variant="outline" onClick={onChangeNotary} className="w-full">
						Change Notary
					</Button>
				</CardContent>
			</Card>

			{/* Workflow Info */}
			<Card>
				<CardContent className="pt-6">
					{bookingWorkflow === "REN" ? (
						<div className="space-y-4">
							<div className="flex items-start gap-3">
								<CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />
								<div>
									<h4 className="font-medium">Remote Electronic Notarization</h4>
									<p className="text-muted-foreground text-sm">
										Conduct notarization remotely via video call or chat.
									</p>
								</div>
							</div>
							<div className="grid grid-cols-1 gap-2 text-sm">
								<div className="flex items-center gap-2">
									<Video className="h-4 w-4 text-blue-600" />
									<span>Video call or chat option</span>
								</div>
								<div className="flex items-center gap-2">
									<Clock className="h-4 w-4 text-blue-600" />
									<span>30-minute sessions</span>
								</div>
								<div className="flex items-center gap-2">
									<CheckCircle className="h-4 w-4 text-blue-600" />
									<span>Remote ID verification</span>
								</div>
							</div>
						</div>
					) : (
						<div className="space-y-4">
							<div className="flex items-start gap-3">
								<CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />
								<div>
									<h4 className="font-medium">In-Person Electronic Notarization</h4>
									<p className="text-muted-foreground text-sm">
										Traditional in-person notarization with physical presence.
									</p>
								</div>
							</div>
							<div className="grid grid-cols-1 gap-2 text-sm">
								<div className="flex items-center gap-2">
									<MapPin className="h-4 w-4 text-green-600" />
									<span>Physical presence required</span>
								</div>
								<div className="flex items-center gap-2">
									<Clock className="h-4 w-4 text-green-600" />
									<span>45-minute sessions</span>
								</div>
								<div className="flex items-center gap-2">
									<User className="h-4 w-4 text-green-600" />
									<span>Physical ID verification</span>
								</div>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
