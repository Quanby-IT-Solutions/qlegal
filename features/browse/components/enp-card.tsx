import Link from "next/link"
import { Briefcase, Clock, Globe, MapPin, MessageSquare, ShieldCheck, User } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardFooter } from "@/core/components/ui/card"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/core/components/ui/tooltip"
import { cn } from "@/core/lib/utils"

import { BookingDialog } from "@/features/browse/components/booking-dialog"
import type { ENPDisplayData } from "@/features/browse/lib/enp-display.types"

import { EnpAvatar } from "./enp-avatar"
import { EnpRating } from "./enp-rating"

interface EnpCardProps {
	enp: ENPDisplayData
	className?: string
}

export function EnpCard({ enp, className }: EnpCardProps) {
	const isAvailable = enp.isAvailable ?? true

	// const specializations =
	// 	enp.specializations && enp.specializations.length > 0
	// 		? enp.specializations
	// 		: enp.specialization
	// 			? [enp.specialization]
	// 			: []

	const languages = Array.isArray(enp.languages)
		? enp.languages
		: enp.languages
			? [enp.languages]
			: []

	return (
		<Card
			className={cn(
				"group border-border/50 hover:border-primary/20 relative flex w-full max-w-[300px] flex-col overflow-hidden pt-0 shadow-sm transition-all duration-300 hover:shadow-md",
				className
			)}
		>
			<div className="from-muted/80 to-muted/30 h-24 w-full border-b bg-linear-to-br">
				{/* <div className="absolute top-3 right-3">
					{enp.rate && (
						<Badge
							variant="secondary"
							className="bg-primary text-primary-foreground border-0 px-3 py-1 text-sm font-bold shadow-lg"
						>
							₱{enp.rate}
						</Badge>
					)}
				</div> */}
			</div>

			<CardContent className="relative flex flex-col items-center px-4 pt-0 text-center">
				<div className="relative -mt-16 mb-3 flex justify-center">
					<EnpAvatar
						name={enp.name}
						image={enp.image}
						className="border-background size-20 border-4 shadow-sm"
					/>
					{isAvailable && (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="bg-background absolute right-0 bottom-0 flex size-6 items-center justify-center rounded-full p-0.5">
										<ShieldCheck className="size-full fill-emerald-500 text-white" />
									</div>
								</TooltipTrigger>
								<TooltipContent>Verified & Available</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)}
				</div>

				<div className="mb-5 flex w-full flex-col items-center space-y-1.5">
					<h3 className="text-foreground w-full truncate px-2 text-lg font-bold tracking-tight">
						{enp.name ?? "Electronic Notary"}
					</h3>

					<div className="flex items-center justify-center">
						{enp.rating > 0 && (
							<EnpRating
								rating={enp.rating}
								reviewCount={enp.reviewCount}
								variant="inline"
								className="justify-center"
							/>
						)}
					</div>
				</div>

				{/* Changed items to flex-col items-center to force center alignment */}
				<div className="bg-muted/40 grid w-full grid-cols-2 gap-x-2 gap-y-4 rounded-xl p-3">
					{enp.location && (
						<div className="flex flex-col items-center justify-start gap-1">
							<span className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase opacity-70">
								<MapPin className="size-3" /> Location
							</span>
							<span className="w-full truncate px-1 text-xs font-semibold" title={enp.location}>
								{enp.location}
							</span>
						</div>
					)}

					{enp.experience && (
						<div className="flex flex-col items-center justify-start gap-1">
							<span className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase opacity-70">
								<Briefcase className="size-3" /> Experience
							</span>
							<span className="w-full truncate px-1 text-xs font-semibold">{enp.experience}</span>
						</div>
					)}

					<div className="flex flex-col items-center justify-start gap-1">
						<span className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase opacity-70">
							<Globe className="size-3" /> Language
						</span>
						<span className="w-full truncate px-1 text-xs font-semibold">
							{languages.length > 0 ? languages[0] : "English"}
							{languages.length > 1 && ` +${languages.length - 1}`}
						</span>
					</div>

					{enp.responseTime && (
						<div className="flex flex-col items-center justify-start gap-1">
							<span className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase opacity-70">
								<Clock className="size-3" /> Response
							</span>
							<span className="w-full truncate px-1 text-xs font-semibold">{enp.responseTime}</span>
						</div>
					)}
				</div>
			</CardContent>

			<CardFooter className="bg-muted/5 grid grid-cols-[1fr_auto_auto] gap-2">
				<BookingDialog
					enpId={enp.id}
					enpName={enp.name}
					trigger={
						<Button size="sm" className="w-full font-semibold shadow-sm">
							Book
						</Button>
					}
				/>

				<TooltipProvider delayDuration={100}>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="outline"
								size="icon"
								className="bg-background hover:bg-muted size-9 shrink-0"
								asChild
							>
								<Link href={`/messages?userId=${enp.id}`}>
									<MessageSquare className="text-muted-foreground size-4" />
								</Link>
							</Button>
						</TooltipTrigger>
						<TooltipContent>Message</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="outline"
								size="icon"
								className="bg-background hover:bg-muted size-9 shrink-0"
								asChild
							>
								<Link href="/profile">
									<User className="text-muted-foreground size-4" />
								</Link>
							</Button>
						</TooltipTrigger>
						<TooltipContent>View Profile</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</CardFooter>
		</Card>
	)
}
