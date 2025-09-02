import {
	ChevronRightIcon,
	Clock,
	// Eye,
	FileText,
	// MoreVertical,
	PlusIcon
	// Share2
} from "lucide-react"

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger
} from "@/core/components/tooltip"
import {
	Avatar,
	AvatarFallback,
	AvatarImage
} from "@/core/components/ui/avatar"
import {
	AvatarGroup,
	AvatarGroupTooltip
} from "@/core/components/ui/avatar-group"
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from "@/core/components/ui/card"
// import {
// 	DropdownMenu,
// 	DropdownMenuContent,
// 	DropdownMenuItem,
// 	DropdownMenuTrigger
// } from "@/core/components/ui/dropdown-menu"
import { Separator } from "@/core/components/ui/separator"
import { getInitials } from "@/core/lib/utils"

import type { RouterOutputs } from "@/services/trpc/client"

import { formatRelativeTime } from "../utils/date"

export function EnvelopeCard({
	envelope
}: {
	envelope: RouterOutputs["envelopeLite"]["getMyEnvelopes"][number]
}) {
	// Deduplicate recipients based on user ID or email
	const uniqueRecipients = envelope.recipient.filter(
		(recipient, index, self) => {
			const identifier = recipient.user?.id ?? recipient.email
			return (
				index === self.findIndex((r) => (r.user?.id ?? r.email) === identifier)
			)
		}
	)

	return (
		<Card className="group flex h-full cursor-pointer flex-col overflow-hidden border border-border bg-background transition-all duration-200 hover:border-foreground/20 hover:shadow-sm dark:bg-muted/60">
			<CardHeader className="group flex flex-1 flex-row items-start justify-between">
				<div className="flex flex-col gap-1">
					<CardTitle className="text-sm">{envelope.title}</CardTitle>
					<CardDescription className="text-xs">
						{envelope.description ?? "No description"}
					</CardDescription>
				</div>

				{/* <Button
					variant="ghost"
					size="sm"
					className="!mt-0 h-6 w-6 p-0 text-muted-foreground transition-opacity"
				>
					<ChevronRightIcon className="h-3.5 w-3.5" />
				</Button> */}

				<TooltipProvider openDelay={100}>
					<Tooltip>
						<TooltipTrigger>
							<div className="!mt-0 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80">
								<ChevronRightIcon className="h-3.5 w-3.5" />
							</div>
						</TooltipTrigger>
						<TooltipContent>Go to envelope</TooltipContent>
					</Tooltip>
				</TooltipProvider>

				{/* <DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							className="!mt-0 h-6 w-6 p-0 text-muted-foreground transition-opacity"
						>
							<MoreVertical className="h-3.5 w-3.5" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem>
							<Eye className="mr-2 h-4 w-4" />
							View
						</DropdownMenuItem>
						<DropdownMenuItem>
							<Share2 className="mr-2 h-4 w-4" />
							Share
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu> */}
			</CardHeader>

			<CardContent className="pb-4 pt-4">
				<Separator />
			</CardContent>

			<CardFooter className="flex flex-row items-center justify-between text-xs text-muted-foreground">
				<div className="flex items-center gap-2">
					{uniqueRecipients.length > 0 ? (
						<div className="flex items-center gap-2">
							<AvatarGroup className="h-6 -space-x-1.5">
								{uniqueRecipients.slice(0, 3).map((recipient, index) => (
									<Avatar
										key={recipient.user?.id ?? recipient.email ?? index}
										className="size-6 border"
									>
										<AvatarImage src={recipient.user?.image ?? ""} />
										<AvatarFallback className="text-[10px] font-medium">
											{getInitials(
												recipient.user?.name ?? recipient.name ?? "?"
											)}
										</AvatarFallback>
										<AvatarGroupTooltip>
											<p className="font-medium">
												{recipient.user?.name ?? recipient.name ?? "Unknown"}
											</p>
											<p className="text-xs text-muted-foreground">
												{recipient.user?.email ?? recipient.email}
											</p>
										</AvatarGroupTooltip>
									</Avatar>
								))}
							</AvatarGroup>
							{uniqueRecipients.length > 3 && (
								<span className="text-xs text-muted-foreground">
									+{uniqueRecipients.length - 3}
								</span>
							)}
						</div>
					) : (
						<AvatarGroup className="h-6 -space-x-1.5">
							{[
								<Avatar key="plus" className="size-6 border bg-muted">
									<AvatarFallback className="text-[10px] font-medium">
										<PlusIcon className="size-3.5" />
									</AvatarFallback>
									<AvatarGroupTooltip>
										<span className="text-sm">Signetories will show here.</span>
									</AvatarGroupTooltip>
								</Avatar>
							]}
						</AvatarGroup>
					)}
				</div>
				<div className="flex items-center gap-1">
					<FileText className="h-3.5 w-3.5" />
					<span>{envelope.documents.length}</span>
				</div>
				<div className="flex items-center gap-1">
					<Clock className="h-3.5 w-3.5" />
					<span>{formatRelativeTime(envelope.updatedAt)}</span>
				</div>
			</CardFooter>
		</Card>
	)
}
