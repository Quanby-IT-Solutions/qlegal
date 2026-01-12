"use client"

import { useRouter } from "next/navigation"
import { Handshake, MapPin, MessageCircle, Star, Video } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

import type { EnhancedENP, WorkflowType } from "../types/find-notary.types"

interface NotaryCardProps {
	enp: EnhancedENP
	onBookConsultation: (enpId: string, workflow: WorkflowType) => void
}

export function NotaryCard({ enp, onBookConsultation }: NotaryCardProps) {
	const router = useRouter()

	return (
		<Card className="transition-shadow hover:shadow-lg">
			<CardHeader>
				<div className="flex items-start gap-4">
					<Avatar className="h-16 w-16">
						<AvatarImage src={enp.image || undefined} alt={enp.name || "ENP"} />
						<AvatarFallback>
							{enp.name
								?.split(" ")
								.map(n => n[0])
								.join("") || "EN"}
						</AvatarFallback>
					</Avatar>
					<div className="flex-1">
						<CardTitle className="text-lg">{enp.name}</CardTitle>
						<CardDescription>Electronic Notary Public</CardDescription>
						<div className="mt-2 flex items-center gap-2">
							<MapPin className="text-muted-foreground h-4 w-4" />
							<span className="text-muted-foreground text-sm">{enp.location}</span>
						</div>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{/* Rating */}
					<div className="flex items-center gap-2">
						<div className="flex items-center">
							{Array.from({ length: 5 }).map((_, i) => (
								<Star
									key={i}
									className={`h-4 w-4 ${
										i < Math.floor(enp.rating) ? "fill-current text-yellow-400" : "text-gray-300"
									}`}
								/>
							))}
						</div>
						<span className="text-sm font-medium">{enp.rating}</span>
						<span className="text-muted-foreground text-sm">({enp.reviewCount} reviews)</span>
					</div>

					{/* Specialization */}
					<div>
						<p className="text-sm font-medium">Specialization</p>
						<p className="text-muted-foreground text-sm">{enp.specialization}</p>
					</div>

					{/* Experience & Languages */}
					<div className="grid grid-cols-2 gap-4 text-sm">
						<div>
							<p className="font-medium">Experience</p>
							<p className="text-muted-foreground">{enp.experience}</p>
						</div>
						<div>
							<p className="font-medium">Languages</p>
							<p className="text-muted-foreground">{enp.languages.join(", ")}</p>
						</div>
					</div>

					{/* Response Time */}
					<div className="text-muted-foreground text-sm">Response time: {enp.responseTime}</div>

					{/* Workflow Support */}
					<div className="flex gap-2">
						<Badge variant="outline" className="flex items-center gap-1">
							<Video className="h-3 w-3" />
							REN
						</Badge>
						<Badge variant="outline" className="flex items-center gap-1">
							<Handshake className="h-3 w-3" />
							IEN
						</Badge>
					</div>

					{/* Action Buttons */}
					<div className="flex flex-wrap gap-2 pt-2">
						<Button
							variant="ghost"
							size="sm"
							className="flex-1 justify-center"
							onClick={() => router.push(`/messages?enpId=${enp.id}`)}
						>
							<MessageCircle className="mr-2 h-4 w-4" />
							Chat
						</Button>
						<Button onClick={() => onBookConsultation(enp.id, "REN")} className="flex-1" size="sm">
							<Video className="mr-2 h-4 w-4" />
							Book REN
						</Button>
						<Button
							onClick={() => onBookConsultation(enp.id, "IEN")}
							variant="outline"
							className="flex-1"
							size="sm"
						>
							<Handshake className="mr-2 h-4 w-4" />
							Book IEN
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
