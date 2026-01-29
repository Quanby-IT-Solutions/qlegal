import Link from "next/link"
import {
	Briefcase,
	Clock3,
	Languages,
	MapPin,
	MessageSquare,
	ShieldCheck,
	User,
} from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import { cn } from "@/core/lib/utils"

import type { ENPDisplayData } from "@/features/browse/lib/enp-display.types"
import { ComprehensiveBookingDialog } from "@/features/consultations/components/comprehensive-booking-dialog"

import { EnpAvatar } from "./enp-avatar"
import { EnpRating } from "./enp-rating"
import { EnpSpecializations } from "./enp-specializations"

interface EnpCardProps {
	enp: ENPDisplayData
	className?: string
	hoverEffect?: boolean
}

export function EnpCard({ enp, className, hoverEffect = false }: EnpCardProps) {
	const cardClasses = `h-full ${hoverEffect ? "hover:shadow-lg transition-shadow" : ""} ${className ?? ""}`
	const isAvailable = enp.isAvailable ?? true
	const specializations =
		enp.specializations && enp.specializations.length > 0
			? enp.specializations
			: enp.specialization
				? [enp.specialization]
				: []
	const languages = Array.isArray(enp.languages)
		? enp.languages
		: enp.languages
			? [enp.languages]
			: []

	return (
		<Card
			className={cn(
				cardClasses,
				"group overflow-hidden transition-shadow duration-200 hover:shadow-xl"
			)}
		>
			<CardHeader className="space-y-3 pb-3">
				<div className="flex items-start justify-between">
					<div className="flex flex-1 items-start gap-3">
						<div className="relative">
							<EnpAvatar name={enp.name} image={enp.image} />
							{isAvailable && (
								<div className="border-background absolute -right-1 -bottom-1 rounded-full border-2 bg-emerald-500 p-0.5">
									<ShieldCheck className="size-3 text-white" />
								</div>
							)}
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2">
								<CardTitle className="truncate text-lg">
									{enp.name ?? "Electronic Notary Public"}
								</CardTitle>
								{enp.initials && (
									<Badge variant="outline" className="shrink-0 text-xs">
										<User className="mr-1 size-2" />
										{enp.initials}
									</Badge>
								)}
							</div>
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

				{specializations.length > 0 && <EnpSpecializations specializations={specializations} />}
			</CardHeader>

			<Separator />

			<CardContent className="flex-1 pt-4">
				{/* Key Information */}
				<div className="grid grid-cols-2 gap-3 text-sm">
					{enp.location && (
						<div className="text-muted-foreground flex items-center gap-2">
							<MapPin className="text-muted-foreground/50 size-4 shrink-0" />
							<span className="truncate">{enp.location}</span>
						</div>
					)}
					{enp.experience && (
						<div className="text-muted-foreground flex items-center gap-2">
							<Briefcase className="text-muted-foreground/50 size-4 shrink-0" />
							<span className="truncate">{enp.experience}</span>
						</div>
					)}
					{enp.responseTime && (
						<div className="text-muted-foreground flex items-center gap-2">
							<Clock3 className="text-muted-foreground/50 size-4 shrink-0" />
							<span className="truncate">Responds in {enp.responseTime}</span>
						</div>
					)}
					{languages.length > 0 && (
						<div className="text-muted-foreground flex items-center gap-2">
							<Languages className="text-muted-foreground/50 size-4 shrink-0" />
							<span className="truncate">
								{languages.slice(0, 2).join(", ")}
								{languages.length > 2 && ` +${languages.length - 2}`}
							</span>
						</div>
					)}
				</div>

				{enp.rate && (
					<div className="bg-muted/50 mt-3 flex items-center justify-between rounded-lg px-3 py-2">
						<span className="text-muted-foreground text-xs">Hourly Rate</span>
						<span className="text-foreground font-semibold">₱{enp.rate}</span>
					</div>
				)}

				{enp.badges && enp.badges.length > 0 && (
					<div className="mt-3 flex flex-wrap gap-1.5">
						{enp.badges.map(badge => (
							<Badge key={badge} variant="secondary" className="text-xs font-normal">
								{badge}
							</Badge>
						))}
					</div>
				)}
			</CardContent>

			<Separator />

			<div className="space-y-2 p-4">
				<ComprehensiveBookingDialog
					enpId={enp.id}
					enpName={enp.name}
					trigger={<Button className="w-full shadow-sm">Book Session</Button>}
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
