import { BadgeCheck, Mail, Phone } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { getInitials } from "@/core/lib/utils"

import type { RouterOutputs } from "@/services/trpc/client"

type Lawyer = RouterOutputs["lawyers"]["getLawyers"][number]

interface LawyerCardProps {
	lawyer: Lawyer
}

export function LawyerCard({ lawyer }: LawyerCardProps) {
	return (
		<Card className="hover:border-primary transition-all duration-200 hover:shadow-md">
			<CardHeader className="pb-4">
				<div className="flex items-start gap-4">
					<Avatar className="h-16 w-16">
						<AvatarImage src={lawyer.image ?? ""} alt={lawyer.name ?? ""} />
						<AvatarFallback className="text-lg">
							{getInitials(lawyer.name ?? "Unknown")}
						</AvatarFallback>
					</Avatar>
					<div className="flex-1 space-y-1">
						<div className="flex items-center gap-2">
							<CardTitle className="text-xl">{lawyer.name ?? "Unknown"}</CardTitle>
							{lawyer.emailVerified && (
								<Badge variant="secondary" className="gap-1">
									<BadgeCheck className="h-3 w-3" />
									Verified
								</Badge>
							)}
						</div>
						<CardDescription className="text-muted-foreground text-sm">
							Electronic Notary Public (ENP)
						</CardDescription>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-3 pb-4">
				{lawyer.email && (
					<div className="flex items-center gap-2">
						<Mail className="text-muted-foreground h-4 w-4" />
						<span className="text-sm">{lawyer.email}</span>
					</div>
				)}
				{lawyer.phoneNumber && (
					<div className="flex items-center gap-2">
						<Phone className="text-muted-foreground h-4 w-4" />
						<span className="text-sm">{lawyer.phoneNumber}</span>
					</div>
				)}
			</CardContent>

			<CardFooter className="flex gap-2 pt-4">
				<Button variant="default" className="flex-1" asChild>
					<a href={`mailto:${lawyer.email}`}>Contact</a>
				</Button>
				<Button variant="outline" className="flex-1">
					View Profile
				</Button>
			</CardFooter>
		</Card>
	)
}
