"use client"

import { useState } from "react"
import { type inferRouterOutputs } from "@trpc/server"
import { format } from "date-fns"
import {
	Ban,
	Calendar,
	CheckCircle2,
	Circle,
	Clock,
	Globe,
	MapPin,
	Play,
	Search,
	XCircle,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardFooter } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Skeleton } from "@/core/components/ui/skeleton"
import { cn, getAvatarUrl, getInitials } from "@/core/lib/utils"

import { type AppRouter } from "@/services/trpc/root"

type IncomingRequest = inferRouterOutputs<AppRouter>["appointments"]["getIncomingRequests"][number]

function PrincipalAvatar({
	name,
	image,
	className,
}: {
	name: string | null
	image?: string | null
	className?: string
}) {
	return (
		<Avatar className={cn("bg-muted", className)}>
			<AvatarImage src={image ?? ""} alt={name ?? "ENP"} className="object-cover" />
			<AvatarFallback className="text-muted-foreground font-medium">
				{getInitials(name ?? "ENP")}
			</AvatarFallback>
		</Avatar>
	)
}

interface AppointmentsListViewProps {
	incomingRequests: IncomingRequest[]
	isRequestsLoading: boolean
	onAccept: (request: IncomingRequest) => void
	onReject: (request: IncomingRequest) => void
	processingId: string | null
}

const STATUS_CONFIG = {
	PENDING: {
		label: "Pending",
		badgeClass:
			"border-0 bg-amber-100 text-amber-700 shadow-xs hover:bg-amber-100/80 dark:bg-amber-900/30 dark:text-amber-400",
		headerGradient: "from-amber-100/80 to-amber-50/30 dark:from-amber-950/30 dark:to-amber-950/10",
		icon: Clock,
		iconClass: "text-amber-600 dark:text-amber-400",
	},
	CONFIRMED: {
		label: "Confirmed",
		badgeClass:
			"border-0 bg-emerald-100 text-emerald-700 shadow-xs hover:bg-emerald-100/80 dark:bg-emerald-900/30 dark:text-emerald-400",
		headerGradient:
			"from-emerald-100/80 to-emerald-50/30 dark:from-emerald-950/30 dark:to-emerald-950/10",
		icon: CheckCircle2,
		iconClass: "text-emerald-600 dark:text-emerald-400",
	},
	IN_PROGRESS: {
		label: "In Progress",
		badgeClass:
			"border-0 bg-blue-100 text-blue-700 shadow-xs hover:bg-blue-100/80 dark:bg-blue-900/30 dark:text-blue-400",
		headerGradient: "from-blue-100/80 to-blue-50/30 dark:from-blue-950/30 dark:to-blue-950/10",
		icon: Clock,
		iconClass: "text-blue-600 dark:text-blue-400",
	},
	ONGOING: {
		label: "Ongoing",
		badgeClass:
			"border-0 bg-violet-100 text-violet-700 shadow-xs hover:bg-violet-100/80 dark:bg-violet-900/30 dark:text-violet-400",
		headerGradient:
			"from-violet-100/80 to-violet-50/30 dark:from-violet-950/30 dark:to-violet-950/10",
		icon: Play,
		iconClass: "text-violet-600 dark:text-violet-400",
	},
	COMPLETED: {
		label: "Completed",
		badgeClass:
			"border-0 bg-green-100 text-green-700 shadow-xs hover:bg-green-100/80 dark:bg-green-900/30 dark:text-green-400",
		headerGradient: "from-green-100/80 to-green-50/30 dark:from-green-950/30 dark:to-green-950/10",
		icon: CheckCircle2,
		iconClass: "text-green-600 dark:text-green-400",
	},
	REJECTED: {
		label: "Rejected",
		badgeClass:
			"border-0 bg-red-100 text-red-700 shadow-xs hover:bg-red-100/80 dark:bg-red-900/30 dark:text-red-400",
		headerGradient: "from-red-100/80 to-red-50/30 dark:from-red-950/30 dark:to-red-950/10",
		icon: XCircle,
		iconClass: "text-red-600 dark:text-red-400",
	},
	CANCELLED: {
		label: "Cancelled",
		badgeClass:
			"border-0 bg-red-100 text-red-700 shadow-xs hover:bg-red-100/80 dark:bg-red-900/30 dark:text-red-400",
		headerGradient: "from-red-100/80 to-red-50/30 dark:from-red-950/30 dark:to-red-950/10",
		icon: Ban,
		iconClass: "text-red-600 dark:text-red-400",
	},
} as const

function getStatusConfig(status: string) {
	return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDING
}

export function AppointmentsListView({
	incomingRequests,
	isRequestsLoading,
	onAccept,
	onReject,
	processingId,
}: AppointmentsListViewProps) {
	const [searchTerm, setSearchTerm] = useState("")
	const [workflowFilter, setWorkflowFilter] = useState("ALL")
	const [statusFilter, setStatusFilter] = useState("ALL")

	const filteredRequests = incomingRequests.filter(request => {
		const matchesStatus = statusFilter === "ALL" || request.status === statusFilter
		const matchesWorkflow = workflowFilter === "ALL" || request.workflow === workflowFilter
		const matchesSearch =
			!searchTerm ||
			Boolean(request.title?.toLowerCase().includes(searchTerm.toLowerCase())) ||
			Boolean(request.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
			Boolean(request.principal?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
		return matchesStatus && matchesWorkflow && matchesSearch
	})

	const pendingCount = incomingRequests.filter(r => r.status === "PENDING").length

	// Calculate stats
	const stats = {
		todayCount: filteredRequests.filter(r => {
			const today = new Date()
			const requestDate = new Date(r.createdAt)
			return requestDate.toDateString() === today.toDateString()
		}).length,
		totalCount: filteredRequests.length,
		pendingCount,
	}

	return (
		<div className="animate-in fade-in mx-auto max-w-7xl space-y-8 duration-300 motion-reduce:animate-none">
			{/* Header Section */}
			<div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold tracking-tight">Requests</h1>
					<p className="text-muted-foreground text-sm">
						Manage your incoming notarization requests.
					</p>
				</div>
				<div className="flex items-center gap-6 text-sm">
					<div className="flex items-baseline gap-2">
						<span className="text-2xl font-semibold tracking-tight">{stats.pendingCount}</span>
						<span className="text-muted-foreground font-medium">pending</span>
					</div>
					<div className="bg-border h-8 w-px" />
					<div className="flex items-baseline gap-2">
						<span className="text-2xl font-semibold tracking-tight">{stats.totalCount}</span>
						<span className="text-muted-foreground font-medium">total</span>
					</div>
				</div>
			</div>

			{/* Controls Section */}
			<div className="flex flex-col gap-3 md:flex-row">
				<div className="relative flex-1">
					<Search
						className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
						aria-hidden
					/>
					<Input
						placeholder="Search requests..."
						value={searchTerm}
						onChange={e => setSearchTerm(e.target.value)}
						className="bg-background pl-9"
					/>
				</div>
				<Select value={workflowFilter} onValueChange={setWorkflowFilter}>
					<SelectTrigger className="bg-background w-32.5">
						<SelectValue placeholder="Type" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">All Types</SelectItem>
						<SelectItem value="REN">Remote</SelectItem>
						<SelectItem value="IEN">In-Person</SelectItem>
					</SelectContent>
				</Select>
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="bg-background w-36">
						<SelectValue placeholder="Status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">All Statuses</SelectItem>
						<SelectItem value="PENDING">Pending</SelectItem>
						<SelectItem value="CONFIRMED">Confirmed</SelectItem>
						<SelectItem value="IN_PROGRESS">In Progress</SelectItem>
						<SelectItem value="ONGOING">Ongoing</SelectItem>
						<SelectItem value="COMPLETED">Completed</SelectItem>
						<SelectItem value="REJECTED">Rejected</SelectItem>
						<SelectItem value="CANCELLED">Cancelled</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Grid Layout */}
			{isRequestsLoading ? (
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<Card key={i} className="border-border/50 overflow-hidden shadow-sm">
							<div className="bg-muted/50 h-20" />
							<CardContent className="relative flex flex-col items-center px-4 pt-0">
								<Skeleton className="border-background -mt-10 size-20 rounded-full border-4" />
								<div className="mt-3 flex flex-col items-center gap-2">
									<Skeleton className="h-5 w-32" />
									<Skeleton className="h-4 w-48" />
								</div>
								<div className="bg-muted/40 mt-6 h-24 w-full rounded-xl" />
							</CardContent>
						</Card>
					))}
				</div>
			) : filteredRequests.length > 0 ? (
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{filteredRequests.map(request => {
						const statusCfg = getStatusConfig(request.status)
						const isPending = request.status === "PENDING"

						return (
							<Card
								key={request.id}
								className="group border-border/50 hover:border-primary/20 relative flex flex-col overflow-hidden pt-0 shadow-sm transition-all duration-300 hover:shadow-md"
							>
								{/* Gradient Header */}
								<div
									className={cn(
										"relative h-24 w-full border-b bg-linear-to-br",
										statusCfg.headerGradient
									)}
								>
									<div className="absolute top-2 right-2">
										<Badge variant="secondary" className={statusCfg.badgeClass}>
											{statusCfg.label}
										</Badge>
									</div>
								</div>

								<CardContent className="relative flex flex-1 flex-col items-center px-4 pt-0 text-center">
									{/* Avatar Overlap */}
									<div className="relative -mt-16 mb-3 flex justify-center">
										<PrincipalAvatar
											name={request.principal?.name ?? ""}
											image={getAvatarUrl(request.principal?.image)}
											className="border-background size-20 border-4 shadow-sm"
										/>
									</div>

									{/* Main Info */}
									<div className="mb-5 flex w-full flex-col items-center space-y-1">
										<h3 className="text-foreground w-full truncate px-2 text-lg font-bold tracking-tight">
											{request.principal?.name ?? "Unknown User"}
										</h3>
										<p className="text-muted-foreground/70 mt-1 line-clamp-2 px-2 text-xs">
											{request.description ?? "No description provided"}
										</p>
									</div>

									{/* Metadata Grid */}
									<div className="bg-muted/40 mt-auto grid w-full grid-cols-2 gap-x-2 gap-y-4 rounded-xl p-3">
										<div className="flex flex-col items-center justify-start gap-1">
											<span className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase opacity-70">
												{request.workflow === "REN" ? (
													<Globe className="size-3" />
												) : (
													<MapPin className="size-3" />
												)}
												Type
											</span>
											<span className="w-full truncate px-1 text-xs font-semibold">
												{request.title}
											</span>
										</div>

										<div className="flex flex-col items-center justify-start gap-1">
											<span className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase opacity-70">
												{request.workflow === "REN" ? (
													<Globe className="size-3" />
												) : (
													<MapPin className="size-3" />
												)}
												Mode
											</span>
											<span className="w-full truncate px-1 text-xs font-semibold">
												{request.workflow === "REN" ? "Remote" : "In-Person"}
											</span>
										</div>

										<div className="flex flex-col items-center justify-start gap-1">
											<span className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase opacity-70">
												<Calendar className="size-3" /> Date
											</span>
											<span className="w-full truncate px-1 text-xs font-semibold">
												{format(new Date(request.createdAt), "MMM d, yyyy")}
											</span>
										</div>

										<div className="flex flex-col items-center justify-start gap-1">
											<span className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase opacity-70">
												<Clock className="size-3" /> Time
											</span>
											<span className="w-full truncate px-1 text-xs font-semibold">
												{format(new Date(request.createdAt), "h:mm a")}
											</span>
										</div>
									</div>
								</CardContent>

								{/* Footer Actions */}
								{isPending ? (
									<CardFooter className="bg-muted/5 grid grid-cols-2 gap-2">
										<Button
											variant="outline"
											size="sm"
											className="border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 w-full"
											onClick={() => onReject(request)}
											disabled={processingId === request.id}
										>
											Reject
										</Button>
										<Button
											size="sm"
											className="w-full shadow-sm"
											onClick={() => onAccept(request)}
											disabled={processingId === request.id}
										>
											{processingId === request.id ? "..." : "Accept"}
										</Button>
									</CardFooter>
								) : (
									<CardFooter className="bg-muted/5 flex items-center justify-center gap-2 py-3">
										{(() => {
											const StatusIcon = statusCfg.icon
											return <StatusIcon className={cn("size-4", statusCfg.iconClass)} />
										})()}
										<span className="text-muted-foreground text-xs font-medium">
											{statusCfg.label}
										</span>
									</CardFooter>
								)}
							</Card>
						)
					})}
				</div>
			) : (
				<div className="animate-in fade-in-50 flex min-h-75 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
					<div className="bg-muted/50 mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
						<Search className="text-muted-foreground/50 size-6" aria-hidden />
					</div>
					<h3 className="text-sm font-medium">No requests found</h3>
					<p className="text-muted-foreground mt-1 text-xs">
						{searchTerm || workflowFilter !== "ALL" || statusFilter !== "ALL"
							? "No requests match your filters."
							: "Your queue is empty."}
					</p>
					{(searchTerm || workflowFilter !== "ALL" || statusFilter !== "ALL") && (
						<Button
							variant="outline"
							size="sm"
							className="mt-4 h-8"
							onClick={() => {
								setSearchTerm("")
								setWorkflowFilter("ALL")
								setStatusFilter("ALL")
							}}
						>
							Clear Filters
						</Button>
					)}
				</div>
			)}
		</div>
	)
}
