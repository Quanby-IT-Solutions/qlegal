"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { format, startOfToday } from "date-fns"
import {
	Calendar as CalendarIcon,
	Clock,
	Loader2,
	Mail,
	MapPin,
	Phone,
} from "lucide-react"

import { PageHeader } from "@/core/components/navbar/page-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Calendar as CalendarComponent } from "@/core/components/ui/calendar"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import { getInitials } from "@/core/lib/utils"

import { trpc, type RouterOutputs } from "@/services/trpc/client"

type WorkflowType = "REN" | "IEN"
type BaseAvailableEnp = RouterOutputs["consultations"]["getAvailableEnps"][number]
type AvailableEnp = BaseAvailableEnp & {
	availableSlots?: Array<{ time: string; duration: number }>
}

type AvailableSlot = { time: string; duration: number; workflow: WorkflowType }
type CalendarEnp = BaseAvailableEnp & {
	availableSlots: AvailableSlot[]
}

function normalizeDate(date: Date): Date {
	const normalized = new Date(date)
	normalized.setHours(12, 0, 0, 0)
	return normalized
}

export default function CalendarPage() {
	const today = useMemo(() => startOfToday(), [])
	const [selectedDate, setSelectedDate] = useState<Date>(() => normalizeDate(new Date()))

	const selectedDateForQuery = useMemo(
		() => (selectedDate ? normalizeDate(selectedDate) : undefined),
		[selectedDate]
	)
	const selectedDateLabel = selectedDate ? format(selectedDate, "EEEE, MMM d") : "Select a date"
	const selectedDateParam = selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""

	const renQuery = trpc.consultations.getAvailableEnps.useQuery(
		{
			workflowType: "REN",
			date: selectedDateForQuery,
		},
		{
			enabled: !!selectedDateForQuery,
		}
	)

	const ienQuery = trpc.consultations.getAvailableEnps.useQuery(
		{
			workflowType: "IEN",
			date: selectedDateForQuery,
		},
		{
			enabled: !!selectedDateForQuery,
		}
	)

	const isBusy = renQuery.isLoading || renQuery.isFetching || ienQuery.isLoading || ienQuery.isFetching
	const hasAnyResults = (renQuery.data?.length ?? 0) > 0 || (ienQuery.data?.length ?? 0) > 0

	const mergedEnps = useMemo((): CalendarEnp[] => {
		const map = new Map<string, CalendarEnp>()

		const addEnps = (enps: BaseAvailableEnp[] | undefined, workflow: WorkflowType) => {
			if (!enps) return
			for (const enp of enps) {
				const slots = ((enp as unknown as AvailableEnp).availableSlots ?? []).map(slot => ({
					time: slot.time,
					duration: slot.duration,
					workflow,
				}))
				const existing = map.get(enp.id)
				if (!existing) {
					map.set(enp.id, { ...enp, availableSlots: slots })
				} else {
					// Merge slots; if same time exists from both workflows, keep the first.
					const existingTimes = new Set(existing.availableSlots.map(s => s.time))
					for (const slot of slots) {
						if (!existingTimes.has(slot.time)) {
							existing.availableSlots.push(slot)
						}
					}
				}
			}
		}

		addEnps(renQuery.data, "REN")
		addEnps(ienQuery.data, "IEN")

		// Sort by name for stable UI
		return Array.from(map.values()).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
	}, [ienQuery.data, renQuery.data])

	return (
		<div className="flex flex-1 flex-col">
			<PageHeader items={[{ label: "Calendar" }]} />

			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="mx-auto max-w-7xl space-y-6">
					<div className="space-y-2">
						<h1 className="text-3xl font-bold tracking-tight">Lawyer Availability</h1>
						<p className="text-muted-foreground">
							View Electronic Notaries Public (ENPs) who are available on a specific day and jump
							straight into booking.
						</p>
					</div>

					<div className="grid gap-6 lg:grid-cols-[420px,1fr]">
						<div className="space-y-4">
							<Card>
								<CardHeader>
									<CardTitle>Pick a day</CardTitle>
									<CardDescription>
										See who is available and what time slots they still have.
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<CalendarComponent
										mode="single"
										selected={selectedDate}
										onSelect={date => date && setSelectedDate(normalizeDate(date))}
										disabled={date => date < today}
										initialFocus
										className="bg-muted/30 w-full max-w-[380px] rounded-2xl border p-4 shadow-sm [--cell-size:2.6rem]"
									/>

									<Separator />

									<div className="flex items-center justify-between">
										<div className="space-y-1">
											<p className="text-sm font-medium">Selected day</p>
											<p className="text-muted-foreground text-sm">{selectedDateLabel}</p>
										</div>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => {
												void renQuery.refetch()
												void ienQuery.refetch()
											}}
											disabled={isBusy}
										>
											{isBusy ? (
												<>
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													Updating
												</>
											) : (
												<>Refresh</>
											)}
										</Button>
									</div>
								</CardContent>
							</Card>
						</div>

						<div className="space-y-4">
							<Card className="border-dashed">
								<CardHeader className="flex flex-row items-center justify-between space-y-0">
									<div>
										<CardTitle className="text-lg">Availability for {selectedDateLabel}</CardTitle>
										<CardDescription>
											{isBusy
												? "Loading availability..."
												: hasAnyResults
													? "Tap a time to start booking."
													: "No ENPs for this day yet."}
										</CardDescription>
									</div>
									<Badge variant={hasAnyResults ? "default" : "outline"}>
										{mergedEnps.length} ENPs
									</Badge>
								</CardHeader>
							</Card>

							{isBusy && (
								<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
									{Array.from({ length: 4 }).map((_, idx) => (
										<Card key={idx} className="animate-pulse">
											<CardHeader className="space-y-3">
												<div className="flex items-center gap-3">
													<div className="bg-muted h-12 w-12 rounded-full" />
													<div className="space-y-2">
														<div className="bg-muted h-4 w-32 rounded" />
														<div className="bg-muted h-3 w-24 rounded" />
													</div>
												</div>
												<div className="bg-muted h-3 w-40 rounded" />
											</CardHeader>
											<CardContent className="space-y-3">
												<div className="bg-muted h-3 w-24 rounded" />
												<div className="bg-muted h-10 rounded" />
											</CardContent>
										</Card>
									))}
								</div>
							)}

							{!isBusy && !hasAnyResults && (
								<Card>
									<CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
										<CalendarIcon className="text-muted-foreground h-10 w-10" />
										<div>
											<p className="font-medium">No schedules found</p>
											<p className="text-muted-foreground text-sm">
												Try another day to see more options.
											</p>
										</div>
									</CardContent>
								</Card>
							)}

							{!isBusy && selectedDateParam && (
								<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
									{mergedEnps.map(enp => (
										<AvailabilityCard key={enp.id} enp={enp} dateParam={selectedDateParam} />
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			</main>
		</div>
	)
}

interface AvailabilityCardProps {
	enp: CalendarEnp
	dateParam: string
}

function AvailabilityCard({ enp, dateParam }: AvailabilityCardProps) {
	const availableSlots = enp.availableSlots

	return (
		<Card className="h-full">
			<CardHeader className="space-y-3">
				<div className="flex items-center gap-3">
					<Avatar className="h-12 w-12">
						<AvatarImage src={enp.image ?? undefined} alt={enp.name ?? "ENP"} />
						<AvatarFallback>{getInitials(enp.name ?? "ENP")}</AvatarFallback>
					</Avatar>
					<div className="min-w-0">
						<CardTitle className="truncate">{enp.name ?? "Electronic Notary Public"}</CardTitle>
						<CardDescription className="truncate">
							{enp.specialization ?? "Legal Services"}
						</CardDescription>
					</div>
					{enp.rating ? (
						<Badge variant="secondary" className="ml-auto">
							⭐ {enp.rating.toFixed(1)}
						</Badge>
					) : null}
				</div>

				<div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
					{enp.phoneNumber && (
						<span className="flex items-center gap-1">
							<Phone className="h-4 w-4" />
							{enp.phoneNumber}
						</span>
					)}
					{enp.email && (
						<span className="flex items-center gap-1">
							<Mail className="h-4 w-4" />
							{enp.email}
						</span>
					)}
					{enp.languages && (
						<span className="flex items-center gap-1">
							<MapPin className="h-4 w-4" />
							{Array.isArray(enp.languages) ? enp.languages.join(", ") : enp.languages}
						</span>
					)}
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				<div className="flex items-center justify-between text-sm">
					<span className="text-muted-foreground">
						Available slots ({availableSlots.length ?? "0"})
					</span>
				</div>

				{availableSlots.length > 0 ? (
					<div className="flex flex-wrap gap-2">
						{availableSlots.map((slot, index) => {
							const searchParams = new URLSearchParams({
								enp: enp.id,
								workflow: slot.workflow,
								date: dateParam,
								time: slot.time,
								mode: "CONSULTATION",
							})

							return (
								<Button
									key={`${slot.time}-${index}`}
									variant="outline"
									size="sm"
									className="gap-2"
									asChild
								>
									<Link href={`/consultations?${searchParams.toString()}`}>
										<Clock className="h-4 w-4" />
										{slot.time}
										<span className="text-muted-foreground text-xs">({slot.duration}m)</span>
									</Link>
								</Button>
							)
						})}
					</div>
				) : (
					<p className="text-muted-foreground text-sm">No open slots for this day.</p>
				)}

				<div className="flex gap-2">
					<Button variant="default" className="flex-1" asChild>
						<Link href={`/consultations?enp=${enp.id}&mode=CONSULTATION`}>
							<CalendarIcon className="mr-2 h-4 w-4" />
							Book Consultation
						</Link>
					</Button>
					<Button variant="outline" className="flex-1" asChild>
						<Link href={`/consultations?enp=${enp.id}&mode=SIGNING`}>
							<CalendarIcon className="mr-2 h-4 w-4" />
							Book Signing
						</Link>
					</Button>
					<Button variant="outline" className="flex-1" asChild>
						<Link href={`/messages?userId=${enp.id}`}>
							<Phone className="mr-2 h-4 w-4" />
							Message
						</Link>
					</Button>
					{enp.email && (
						<Button variant="outline" className="flex-1" asChild>
							<a href={`mailto:${enp.email}`}>
								<Mail className="mr-2 h-4 w-4" />
								Email
							</a>
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
