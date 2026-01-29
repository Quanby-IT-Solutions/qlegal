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

export function EnpCard({ enp, className }: EnpCardProps) {
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
		<Card className={cn("max-w-xs", className)}>
			<CardHeader className="space-y-2 px-4">
				<div className="flex items-center gap-3">
					<div className="relative shrink-0">
						<EnpAvatar name={enp.name} image={enp.image} isAvailable={isAvailable} />
						{isAvailable && (
							<div className="border-background absolute -right-1 -bottom-1 rounded-full border-2 bg-emerald-500 p-0.5">
								<ShieldCheck className="size-3 text-white" aria-label="Available" />
							</div>
						)}
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-1.5">
							<CardTitle className="truncate text-sm">
								{enp.name ?? "Electronic Notary Public"}
							</CardTitle>
							{enp.initials && (
								<Badge variant="secondary" className="shrink-0 text-xs">
									<User className="mr-1 size-2.5" />
									{enp.initials}
								</Badge>
							)}
						</div>
						{enp.rating > 0 && (
							<EnpRating
								rating={enp.rating}
								reviewCount={enp.reviewCount}
								variant="inline"
								className="mt-0.5"
							/>
						)}
					</div>
				</div>

				{specializations.length > 0 && <EnpSpecializations specializations={specializations} />}
			</CardHeader>

			<Separator />

			<CardContent className="space-y-2 px-4 pt-2">
				{/* Consultation Price */}
				{enp.rate && (
					<div className="flex items-center justify-between text-xs">
						<span className="text-muted-foreground">Consultation Price</span>
						<span className="font-semibold">₱{enp.rate}</span>
					</div>
				)}

				{/* Key Information - Single Column */}
				<div className="grid grid-cols-1 gap-1 text-xs">
					{enp.location && (
						<div className="flex items-center gap-2">
							<MapPin className="text-muted-foreground size-3 shrink-0" />
							<span className="truncate">{enp.location}</span>
						</div>
					)}
					{enp.experience && (
						<div className="flex items-center gap-2">
							<Briefcase className="text-muted-foreground size-3 shrink-0" />
							<span className="truncate">{enp.experience}</span>
						</div>
					)}
					{enp.responseTime && (
						<div className="flex items-center gap-2">
							<Clock3 className="text-muted-foreground size-3 shrink-0" />
							<span className="truncate">Responds in {enp.responseTime}</span>
						</div>
					)}
					{languages.length > 0 && (
						<div className="flex items-center gap-2">
							<Languages className="text-muted-foreground size-3 shrink-0" />
							<span className="truncate">
								{languages.slice(0, 2).join(", ")}
								{languages.length > 2 && ` +${languages.length - 2}`}
							</span>
						</div>
					)}
				</div>

				{/* Qualifications Badges */}
				{enp.badges && enp.badges.length > 0 && (
					<div className="flex flex-wrap gap-1">
						{enp.badges.map(badge => (
							<Badge key={badge} variant="secondary" className="text-[10px]">
								{badge}
							</Badge>
						))}
					</div>
				)}
			</CardContent>

			<Separator />

			<div className="flex gap-1 p-2">
				<ComprehensiveBookingDialog
					enpId={enp.id}
					enpName={enp.name}
					trigger={
						<Button size="sm" className="flex-1 text-xs">
							Book
						</Button>
					}
				/>
				<Button variant="outline" size="icon" asChild aria-label="Message">
					<Link href={`/messages?userId=${enp.id}`}>
						<MessageSquare className="size-3.5" aria-hidden="true" />
					</Link>
				</Button>
				<Button variant="outline" size="icon" asChild aria-label="View profile">
					<Link href="/profile">
						<User className="size-3.5" aria-hidden="true" />
					</Link>
				</Button>
			</div>
		</Card>
	)
}
