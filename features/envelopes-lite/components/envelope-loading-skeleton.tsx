"use client"

import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import { Skeleton } from "@/core/components/ui/skeleton"

interface EnvelopeLoadingSkeletonProps {
	viewMode?: "grid" | "list"
}

export function EnvelopeLoadingSkeleton({
	viewMode = "grid"
}: EnvelopeLoadingSkeletonProps) {
	if (viewMode === "list") {
		return (
			<div className="space-y-3">
				{Array.from({ length: 6 }, (_, index) => (
					<EnvelopeListItemSkeleton key={index} />
				))}
			</div>
		)
	}

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{Array.from({ length: 4 }, (_, index) => (
				<EnvelopeCardSkeleton key={index} />
			))}
		</div>
	)
}

export function EnvelopeListItemSkeleton() {
	return (
		<Card className="animate-pulse border border-border bg-background transition-all dark:bg-muted/60">
			<CardContent className="p-4">
				<div className="flex items-center justify-between">
					<div className="flex flex-1 items-center gap-3">
						<Skeleton className="h-8 w-8 rounded-full" />

						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-1.5 w-1.5 rounded-full" />
								<Skeleton className="h-3 w-16" />
							</div>
							<Skeleton className="mt-1 h-3 w-24" />
						</div>
					</div>

					<div className="flex items-center gap-4 text-xs text-muted-foreground">
						<div className="flex items-center gap-1">
							<Skeleton className="h-3.5 w-3.5" />
							<Skeleton className="h-3 w-4" />
						</div>
						<div className="flex items-center gap-1">
							<Skeleton className="h-3.5 w-3.5" />
							<Skeleton className="h-3 w-4" />
						</div>
						<div className="flex items-center gap-1">
							<Skeleton className="h-3.5 w-3.5" />
							<Skeleton className="h-3 w-12" />
						</div>
						<Skeleton className="h-6 w-6" />
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

export function EnvelopeCardSkeleton() {
	return (
		<Card className="group flex h-full animate-pulse cursor-pointer flex-col overflow-hidden border border-border bg-background transition-all duration-1000 hover:border-foreground/20 hover:shadow-sm dark:bg-muted/60">
			<CardHeader className="group flex flex-1 flex-row items-start justify-between">
				<div className="flex w-full flex-col gap-1">
					<CardTitle className="text-sm">
						<Skeleton className="mb-1 h-4 w-32" />
					</CardTitle>
					<CardDescription className="text-xs">
						<Skeleton className="h-3 w-24" />
					</CardDescription>
				</div>
				<div className="!mt-0 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
					<Skeleton className="h-3.5 w-3.5 rounded-full" />
				</div>
			</CardHeader>
			<CardContent className="pb-4 pt-4">
				<Separator />
			</CardContent>
			<CardFooter className="flex flex-row items-center justify-between text-xs text-muted-foreground">
				<div className="flex items-center gap-2">
					<div className="flex items-center gap-2">
						<div className="flex -space-x-1.5">
							{Array.from({ length: 3 }).map((_, i) => (
								<Skeleton key={i} className="size-6 rounded-full border" />
							))}
						</div>
						<span className="text-xs text-muted-foreground">
							<Skeleton className="h-3 w-6" />
						</span>
					</div>
				</div>
				<div className="flex items-center gap-1">
					<Skeleton className="h-3.5 w-3.5 rounded" />
					<Skeleton className="h-3 w-4" />
				</div>
				<div className="flex items-center gap-1">
					<Skeleton className="h-3.5 w-3.5 rounded" />
					<Skeleton className="h-3 w-10" />
				</div>
			</CardFooter>
		</Card>
	)
}
