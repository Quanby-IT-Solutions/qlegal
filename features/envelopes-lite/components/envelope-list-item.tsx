"use client"

import { ChevronRightIcon, Clock, FileText, PlusIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Card, CardContent } from "@/core/components/ui/card"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/core/components/ui/tooltip"
import { getFullName, getInitials } from "@/core/lib/utils"

import type { RouterOutputs } from "@/services/trpc/client"

import { formatRelativeTime } from "../utils/date"

interface EnvelopeListItemProps {
	envelope: RouterOutputs["envelopeLite"]["getMyEnvelopes"][number]
}

export function EnvelopeListItem({ envelope }: EnvelopeListItemProps) {
	// For now, just show the envelope creator since recipient data doesn't exist in mock
	const creator = envelope.user

	return (
		<Card className="group border-border bg-background hover:border-foreground/20 dark:bg-muted/60 cursor-pointer border transition-all duration-200 hover:shadow-sm">
			<CardContent className="p-4">
				<div className="flex items-center justify-between">
					{/* Main content - left side */}
					<div className="flex flex-1 items-center gap-4">
						{/* Title and description */}
						<div className="min-w-0 flex-1">
							<h3 className="text-foreground truncate text-sm font-medium">{envelope.title}</h3>
							<p className="text-muted-foreground truncate text-xs">
								{envelope.description ?? "No description"}
							</p>
						</div>

						{/* Creator */}
						<div className="flex items-center gap-2">
							{creator ? (
								<div className="flex h-6 -space-x-1.5">
									<Avatar key={creator.id} className="size-6 border">
										<AvatarImage src={creator.image ?? ""} />
										<AvatarFallback className="text-[10px] font-medium">
											{getInitials(getFullName(creator) || "?")}
										</AvatarFallback>
									</Avatar>
								</div>
							) : (
								<div className="flex h-6 -space-x-1.5">
									<Avatar key="plus" className="bg-muted size-6 border">
										<AvatarFallback className="text-[10px] font-medium">
											<PlusIcon className="size-3.5" />
										</AvatarFallback>
									</Avatar>
								</div>
							)}
						</div>

						{/* Stats */}
						<div className="text-muted-foreground flex items-center gap-4 text-xs">
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
								<div className="bg-muted text-muted-foreground hover:bg-muted/80 ml-2.5 flex h-6 w-6 items-center justify-center rounded-full transition-colors">
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
