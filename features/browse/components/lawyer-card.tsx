import { BadgeCheck, Calendar, Mail, Phone } from "lucide-react"

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

import { AppointmentBookingDialog, type Lawyer } from "./appointment-booking-dialog"

interface LawyerCardProps {
	lawyer: Lawyer
}

export function LawyerCard({ lawyer }: LawyerCardProps) {
	return (
		<Card className="hover:border-primary flex h-full flex-col transition-all duration-200 hover:shadow-md">
			<CardHeader className="pb-3">
				<div className="flex items-start gap-3">
					<Avatar className="h-14 w-14 shrink-0">
						<AvatarImage src={lawyer.image ?? ""} alt={lawyer.name ?? ""} />
						<AvatarFallback className="text-base">
							{getInitials(lawyer.name ?? "Unknown")}
						</AvatarFallback>
					</Avatar>
					<div className="flex min-w-0 flex-1 flex-col gap-1">
						<div className="flex min-w-0 items-start gap-2">
							<CardTitle
								className="min-w-0 flex-1 text-lg leading-tight wrap-break-word"
								title={lawyer.name ?? "Unknown"}
							>
								{lawyer.name ?? "Unknown"}
							</CardTitle>
							{lawyer.emailVerified && (
								<Badge variant="secondary" className="shrink-0 gap-1 text-xs whitespace-nowrap">
									<BadgeCheck className="h-3 w-3" />
									Verified
								</Badge>
							)}
						</div>
						<CardDescription className="text-muted-foreground text-xs">
							Electronic Notary Public (ENP)
						</CardDescription>
					</div>
				</div>
			</CardHeader>

			<CardContent className="flex-1 space-y-2 pb-4">
				{lawyer.email && (
					<div className="flex min-w-0 items-center gap-2.5">
						<Mail className="text-muted-foreground h-4 w-4 shrink-0" />
						<span className="truncate text-sm" title={lawyer.email}>
							{lawyer.email}
						</span>
					</div>
				)}
				{lawyer.phoneNumber && (
					<div className="flex min-w-0 items-center gap-2.5">
						<Phone className="text-muted-foreground h-4 w-4 shrink-0" />
						<span className="truncate text-sm" title={lawyer.phoneNumber}>
							{lawyer.phoneNumber}
						</span>
					</div>
				)}
			</CardContent>

			<CardFooter className="flex gap-2 border-t pt-4">
				<AppointmentBookingDialog
					lawyer={lawyer}
					trigger={
						<Button variant="default" size="sm" className="flex-1">
							<Calendar className="mr-1.5 h-3.5 w-3.5" />
							Book
						</Button>
					}
				/>
				<Button variant="outline" size="sm" className="flex-1" asChild>
					<a href={`mailto:${lawyer.email}`}>
						<Mail className="mr-1.5 h-3.5 w-3.5" />
						Email
					</a>
				</Button>
			</CardFooter>
		</Card>
	)
}
