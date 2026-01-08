"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { format, startOfToday } from "date-fns"
import { Calendar as CalendarIcon, Clock, Handshake, Loader2, Mail, MapPin, Phone, Video } from "lucide-react"

import { PageHeader } from "@/core/components/navbar/page-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Calendar as CalendarComponent } from "@/core/components/ui/calendar"
import { Separator } from "@/core/components/ui/separator"
import { getInitials } from "@/core/lib/utils"
import { trpc, type RouterOutputs } from "@/services/trpc/client"

type WorkflowType = "REN" | "IEN"
type BaseAvailableEnp = RouterOutputs["consultations"]["getAvailableEnps"][number]
type AvailableEnp = BaseAvailableEnp & {
	availableSlots?: Array<{ time: string; duration: number }>
}

function normalizeDate(date: Date): Date {
	const normalized = new Date(date)
	normalized.setHours(12, 0, 0, 0)
	return normalized
}

export default function CalendarPage() {
	const today = useMemo(() => startOfToday(), [])
	const [workflowType, setWorkflowType] = useState<WorkflowType>("REN")
	const [selectedDate, setSelectedDate] = useState<Date>(() => normalizeDate(new Date()))

	const selectedDateForQuery = useMemo(() => (selectedDate ? normalizeDate(selectedDate) : undefined), [selectedDate])
	const selectedDateLabel = selectedDate ? format(selectedDate, "EEEE, MMM d") : "Select a date"
	const selectedDateParam = selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""

	const {
		data: availableEnps,
		isLoading,
		isFetching,
		refetch,
	} = trpc.consultations.getAvailableEnps.useQuery(
		{
			workflowType,
			date: selectedDateForQuery,
		},
		{
			enabled: !!selectedDateForQuery,
		}
	)

	const hasResults = (availableEnps?.length ?? 0) > 0
	const isBusy = isLoading || isFetching

	return (
		<div className="flex flex-1 flex-col">
			<PageHeader items={[{ label: "Calendar" }]} />

			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="mx-auto max-w-7xl space-y-6">
					<div className="space-y-2">
						<h1 className="text-3xl font-bold tracking-tight">Lawyer Availability</h1>
						<p className="text-muted-foreground">
							View Electronic Notaries Public (ENPs) who are available on a specific day and jump straight into
							booking.
						</p>
					</div>

					<div className="grid gap-6 lg:grid-cols-[420px,1fr]">
						<div className="space-y-4">
							<Card>
								<CardHeader>
									<CardTitle>Select workflow</CardTitle>
									<CardDescription>Switch between remote (REN) and in-person (IEN) availability.</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="grid grid-cols-2 gap-3">
										<Button
											variant={workflowType === "REN" ? "default" : "outline"}
											onClick={() => setWorkflowType("REN")}
											className="justify-start gap-2"
										>
											<Video className="h-4 w-4" />
											Remote (REN)
										</Button>
										<Button
											variant={workflowType === "IEN" ? "default" : "outline"}
											onClick={() => setWorkflowType("IEN")}
											className="justify-start gap-2"
										>
											<Handshake className="h-4 w-4" />
											In-Person (IEN)
										</Button>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Pick a day</CardTitle>
									<CardDescription>See who is available and what time slots they still have.</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<CalendarComponent
										mode="single"
										selected={selectedDate}
										onSelect={(date) => date && setSelectedDate(normalizeDate(date))}
										disabled={(date) => date < today}
										initialFocus
										className="w-full max-w-[380px] rounded-2xl border bg-muted/30 p-4 shadow-sm [--cell-size:2.6rem]"
									/>

									<Separator />

									<div className="flex items-center justify-between">
										<div className="space-y-1">
											<p className="text-sm font-medium">Selected day</p>
											<p className="text-muted-foreground text-sm">{selectedDateLabel}</p>
										</div>
										<Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isBusy}>
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
											{isBusy ? "Loading availability..." : hasResults ? "Tap a time to start booking." : "No ENPs for this day yet."}
										</CardDescription>
									</div>
									<Badge variant={hasResults ? "default" : "outline"}>{availableEnps?.length ?? 0} ENPs</Badge>
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

							{!isBusy && !hasResults && (
								<Card>
									<CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
										<CalendarIcon className="text-muted-foreground h-10 w-10" />
										<div>
											<p className="font-medium">No schedules found</p>
											<p className="text-muted-foreground text-sm">
												Try another day or switch workflows to see more options.
											</p>
										</div>
									</CardContent>
								</Card>
							)}

							{!isBusy && hasResults && selectedDateParam && (
								<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
									{availableEnps?.map((enp) => (
										<AvailabilityCard
											key={enp.id}
											enp={enp as AvailableEnp}
											workflowType={workflowType}
											dateParam={selectedDateParam}
										/>
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
	enp: AvailableEnp
	workflowType: WorkflowType
	dateParam: string
}

function AvailabilityCard({ enp, workflowType, dateParam }: AvailabilityCardProps) {
	// Type assertion: availableSlots is not in the TRPC return type but is expected to be extended
	const availableSlots: Array<{ time: string; duration: number }> = (enp as unknown as AvailableEnp).availableSlots ?? []

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
						<CardDescription className="truncate">{enp.specialization ?? "Legal Services"}</CardDescription>
					</div>
					{enp.rating ? (
						<Badge variant="secondary" className="ml-auto">
							⭐ {enp.rating.toFixed(1)}
						</Badge>
					) : null}
				</div>

				<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
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
					<Badge variant="outline" className="gap-1">
						<CalendarIcon className="h-3.5 w-3.5" />
						{workflowType}
					</Badge>
				</div>

				{availableSlots.length > 0 ? (
					<div className="flex flex-wrap gap-2">
						{availableSlots.map((slot: { time: string; duration: number }, index: number) => {
							const searchParams = new URLSearchParams({
								enp: enp.id,
								workflow: workflowType,
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
						<Link href={`/consultations?enp=${enp.id}&workflow=${workflowType}&mode=CONSULTATION`}>
							<CalendarIcon className="mr-2 h-4 w-4" />
							Book Consultation
						</Link>
					</Button>
					<Button variant="outline" className="flex-1" asChild>
						<Link href={`/consultations?enp=${enp.id}&workflow=${workflowType}&mode=SIGNING`}>
							<CalendarIcon className="mr-2 h-4 w-4" />
							Book Signing
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

