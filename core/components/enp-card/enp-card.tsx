import Link from "next/link"
import {
	Briefcase,
	Calendar as CalendarIcon,
	Clock3,
	Languages,
	Mail,
	MapPin,
	MessageSquare,
	Phone,
	ShieldCheck,
} from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import type { ENPAvailableSlot, ENPProfile } from "@/core/lib/types/enp"

import { ComprehensiveBookingDialog } from "@/features/consultations/components/comprehensive-booking-dialog"

import { EnpAvailableSlots } from "./enp-available-slots"
import { EnpAvatar } from "./enp-avatar"
import { EnpContactInfo } from "./enp-contact-info"
import { EnpRating } from "./enp-rating"

interface EnpCardProps {
	enp: ENPProfile
	variant?: "calendar" | "browse"
	availableSlots?: ENPAvailableSlot[]
	dateParam?: string
	className?: string
	hoverEffect?: boolean
}

export function EnpCard({
	enp,
	variant = "calendar",
	availableSlots = [],
	dateParam,
	className,
	hoverEffect = false,
}: EnpCardProps) {
	const cardClasses = `h-full ${hoverEffect ? "hover:shadow-lg transition-shadow" : ""} ${className ?? ""}`
	const languages = Array.isArray(enp.languages)
		? enp.languages
		: enp.languages
			? [enp.languages]
			: []
	const isAvailable = enp.isAvailable ?? true

	if (variant === "browse") {
		return (
			<Card className={cardClasses}>
				<CardHeader className="pb-3">
					<div className="flex items-start justify-between">
						<div className="flex flex-1 items-start gap-3">
							<EnpAvatar name={enp.name} image={enp.image} />
							<div className="flex-1">
								<CardTitle className="text-lg">{enp.name ?? "Electronic Notary Public"}</CardTitle>
								{enp.rating > 0 && (
									<EnpRating
										rating={enp.rating}
										reviewCount={enp.reviewCount}
										variant="inline"
										className="mt-1"
									/>
								)}
							</div>
						</div>
					</div>
				</CardHeader>

				<CardContent className="flex-1 space-y-3">
					{/* Badges */}
					<div className="flex flex-wrap items-center gap-2">
						{enp.badges?.map(badge => (
							<Badge key={badge} variant="secondary" className="text-xs">
								{badge}
							</Badge>
						))}
						{isAvailable && (
							<Badge
								variant="outline"
								className="border-emerald-200 bg-emerald-50 text-xs text-emerald-700"
							>
								<ShieldCheck className="mr-1 size-3" />
								Available now
							</Badge>
						)}
					</div>

					{/* Specialization */}
					{enp.specialization && (
						<div className="bg-muted/50 text-foreground rounded-md px-3 py-2 text-sm font-medium">
							{enp.specialization}
						</div>
					)}

					<div className="text-muted-foreground grid grid-cols-1 gap-3 text-sm">
						{enp.location && (
							<div className="flex items-center gap-2">
								<MapPin className="size-4" />
								<span>{enp.location}</span>
							</div>
						)}

						{languages.length > 0 && (
							<div className="flex items-center gap-2">
								<Languages className="size-4" />
								<span className="truncate">{languages.join(", ")}</span>
							</div>
						)}

						{enp.experience && (
							<div className="flex items-center gap-2">
								<Briefcase className="size-4" />
								<span>{enp.experience}</span>
							</div>
						)}

						{enp.responseTime && (
							<div className="flex items-center gap-2">
								<Clock3 className="size-4" />
								<span>Responds in {enp.responseTime}</span>
							</div>
						)}

						{enp.rate && (
							<div className="flex items-center gap-2">
								<CalendarIcon className="size-4" />
								<span className="text-foreground font-semibold">₱{enp.rate} / hour</span>
							</div>
						)}
					</div>
				</CardContent>

				<div className="space-y-2 border-t p-4">
					<ComprehensiveBookingDialog
						enpId={enp.id}
						enpName={enp.name}
						trigger={<Button className="w-full">Book Session</Button>}
					/>
					<Button variant="outline" className="w-full" asChild>
						<Link href={`/messages?userId=${enp.id}`}>
							<MessageSquare className="mr-2 size-4" />
							Message
						</Link>
					</Button>
				</div>
			</Card>
		)
	}

	// Calendar variant
	return (
		<Card className={cardClasses}>
			<CardHeader className="space-y-3">
				<div className="flex items-center gap-3">
					<EnpAvatar name={enp.name} image={enp.image} />
					<div className="min-w-0">
						<CardTitle className="truncate">{enp.name ?? "Electronic Notary Public"}</CardTitle>
						<CardDescription className="truncate">
							{enp.specialization ?? "Legal Services"}
						</CardDescription>
					</div>
					{enp.rating > 0 && <EnpRating rating={enp.rating} variant="badge" className="ml-auto" />}
				</div>

				<EnpContactInfo phoneNumber={enp.phoneNumber} email={enp.email} languages={enp.languages} />
			</CardHeader>

			<CardContent className="space-y-4">
				<EnpAvailableSlots slots={availableSlots} enpId={enp.id} dateParam={dateParam} />

				<div className="flex gap-2">
					<Button variant="default" className="flex-1" asChild>
						<Link href={`/consultations?enp=${enp.id}&mode=CONSULTATION`}>
							<CalendarIcon className="mr-2 size-4" />
							Book Consultation
						</Link>
					</Button>
					<Button variant="outline" className="flex-1" asChild>
						<Link href={`/consultations?enp=${enp.id}&mode=SIGNING`}>
							<CalendarIcon className="mr-2 size-4" />
							Book Signing
						</Link>
					</Button>
					<Button variant="outline" className="flex-1" asChild>
						<Link href={`/messages?userId=${enp.id}`}>
							<Phone className="mr-2 size-4" />
							Message
						</Link>
					</Button>
					{enp.email && (
						<Button variant="outline" className="flex-1" asChild>
							<a href={`mailto:${enp.email}`}>
								<Mail className="mr-2 size-4" />
								Email
							</a>
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
