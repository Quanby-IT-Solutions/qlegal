"use client"

import { ChevronRightIcon, Clock, FileText, PlusIcon } from "lucide-react"

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger
} from "@/core/components/ui/tooltip"
import {
	Avatar,
	AvatarFallback,
	AvatarImage
} from "@/core/components/ui/avatar"
import { Card, CardContent } from "@/core/components/ui/card"
import { getInitials } from "@/core/lib/utils"

import type { RouterOutputs } from "@/services/trpc/client"

import { formatRelativeTime } from "../utils/date"

interface EnvelopeListItemProps {
	envelope: RouterOutputs["envelopeLite"]["getMyEnvelopes"][number]
}

export function EnvelopeListItem({ envelope }: EnvelopeListItemProps) {
	// For now, just show the envelope creator since recipient data doesn't exist in mock
	const creator = envelope.user

	return (
		<Card className="group cursor-pointer border border-border bg-background transition-all duration-200 hover:border-foreground/20 hover:shadow-sm dark:bg-muted/60">
			<CardContent className="p-4">
				<div className="flex items-center justify-between">
					{/* Main content - left side */}
					<div className="flex flex-1 items-center gap-4">
						{/* Title and description */}
						<div className="min-w-0 flex-1">
							<h3 className="truncate text-sm font-medium text-foreground">
								{envelope.title}
							</h3>
							<p className="truncate text-xs text-muted-foreground">
								{envelope.description ?? "No description"}
							</p>
						</div>

						{/* Creator */}
						<div className="flex items-center gap-2">
							{creator ? (
								<div className="flex h-6 -space-x-1.5">
									<Avatar
										key={creator.id}
										className="size-6 border"
									>
										<AvatarImage src={creator.image ?? ""} />
										<AvatarFallback className="text-[10px] font-medium">
											{getInitials(creator.name ?? "?")}
										</AvatarFallback>
									</Avatar>
								</div>
							) : (
								<div className="flex h-6 -space-x-1.5">
									<Avatar key="plus" className="size-6 border bg-muted">
										<AvatarFallback className="text-[10px] font-medium">
											<PlusIcon className="size-3.5" />
										</AvatarFallback>
									</Avatar>
								</div>
							)}
						</div>

						{/* Stats */}
						<div className="flex items-center gap-4 text-xs text-muted-foreground">
							<div className="flex items-center gap-1">
								<FileText className="h-3.5 w-3.5" />
								<span>0</span>
							</div>
							<div className="flex items-center gap-1">
								<Clock className="h-3.5 w-3.5" />
								<span>{formatRelativeTime(envelope.updatedAt)}</span>
							</div>
						</div>
					</div>

					{/* Action - right side */}
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger>
								<div className="ml-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80">
									<ChevronRightIcon className="h-3.5 w-3.5" />
								</div>
							</TooltipTrigger>
							<TooltipContent>Go to envelope</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			</CardContent>
		</Card>
	)
}
