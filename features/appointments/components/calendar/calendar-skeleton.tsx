import { Badge } from "@/core/components/ui/badge"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import { Skeleton } from "@/core/components/ui/skeleton"

const cellBadgePattern = Array.from({ length: 42 }, (_, index) => {
	const pattern = [0, 1, 2, 1, 0, 1, 0]
	return pattern[index % pattern.length] ?? 0
})

export function CalendarSkeleton() {
	return (
		<Card className="col-span-2 mb-4 lg:mb-0">
			<CardHeader>
				<CardTitle>
					<Skeleton className="h-7 w-32" />
				</CardTitle>
				<CardDescription>
					<Skeleton className="h-4 w-24" />
				</CardDescription>
			</CardHeader>
			<Separator />
			<CardContent>
				<div className="mb-3 flex items-center justify-between">
					<div className="flex flex-wrap items-center gap-1">
						<Skeleton className="h-10 w-40" />
						<Skeleton className="h-10 w-40" />
						<Skeleton className="h-10 w-40" />
					</div>
					<div className="flex items-center gap-2">
						<Skeleton className="size-10" />
						<Skeleton className="size-10" />
					</div>
				</div>

				<div className="grid grow grid-cols-7">
					{Array.from({ length: 7 }, (_, index) => (
						<div className="text-muted-foreground p-3 text-center text-xs" key={index}>
							<Skeleton className="mx-auto h-4 w-8" />
						</div>
					))}
				</div>

				<div className="grid grow grid-cols-7">
					{cellBadgePattern.map((badgeCount, index) => (
						<div
							key={index}
							className={`relative aspect-square overflow-hidden border-t border-r ${index % 7 === 6 ? "border-r-0" : ""}`}
						>
							<div className="text-muted-foreground relative flex size-full flex-col gap-1 p-1 text-xs">
								{index % 11 === 0 ? (
									<Badge variant="secondary" className="border-input w-fit border font-normal">
										<Skeleton className="h-4 w-6" />
									</Badge>
								) : (
									<Skeleton className="h-4 w-6" />
								)}

								<div>
									{Array.from({ length: badgeCount }, (_, badgeIndex) => (
										<div key={badgeIndex} className="flex min-w-0 items-center gap-2">
											<Badge variant="outline" className="truncate">
												<Skeleton className="h-5 w-16 rounded-full" />
											</Badge>
										</div>
									))}
								</div>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	)
}
