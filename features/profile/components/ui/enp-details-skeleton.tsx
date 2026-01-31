import { Skeleton } from "@/core/components/ui/skeleton"

export function ProfessionalDetailsSkeleton() {
	return (
		<div className="relative space-y-6 rounded-lg border-2 border-transparent p-6">
			{/* Edit Button Skeleton */}
			<div className="absolute top-4 right-4">
				<Skeleton className="size-8 rounded-md" />
			</div>

			{/* BIO Skeleton */}
			<div className="pt-4">
				<Skeleton className="mb-2 h-5 w-16" />
				<div className="space-y-2">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-3/4" />
				</div>
			</div>

			{/* Experience Badge Skeleton */}
			<div>
				<Skeleton className="mb-3 h-5 w-24" />
				<Skeleton className="h-9 w-32 rounded-full" />
			</div>

			{/* Response Time Skeleton */}
			<div>
				<Skeleton className="mb-2 h-5 w-32" />
				<Skeleton className="h-4 w-24" />
			</div>

			{/* Rating Skeleton */}
			<div>
				<Skeleton className="mb-3 h-5 w-16" />
				<div className="flex items-center gap-2">
					<div className="flex gap-1">
						{[...Array<number>(5)].map((_, i) => (
							<Skeleton key={i} className="size-5" />
						))}
					</div>
					<Skeleton className="h-4 w-12" />
					<Skeleton className="h-3 w-20" />
				</div>
			</div>
		</div>
	)
}
