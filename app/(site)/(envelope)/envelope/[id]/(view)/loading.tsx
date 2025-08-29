import { SiteNavbar } from "@/core/components/navbar/site-navbar"
import { Skeleton } from "@/core/components/ui/skeleton"

export default function Loading() {
	return (
		<>
			<SiteNavbar
				items={[
					{ label: "Envelopes", url: "/envelopes" },
					{ label: "Loading..." }
				]}
			/>
			<div className="min-h-screen bg-muted dark:bg-background">
				{/* Header */}
				<div className="border-b bg-background backdrop-blur dark:bg-muted/60">
					<div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
						<div className="flex items-center gap-4">
							<div>
								<Skeleton className="h-8 w-64" />
								<div className="mt-1">
									<Skeleton className="h-4 w-48" />
								</div>
							</div>
						</div>

						{/* Controls skeleton - matches search and upload layout */}
						<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex flex-1 items-center gap-4">
								{/* Search skeleton */}
								<div className="relative max-w-sm flex-1">
									<Skeleton className="h-10 w-full" />
								</div>
							</div>
							<div className="flex items-center gap-4">
								{/* Upload button skeleton */}
								<Skeleton className="h-10 w-32" />
							</div>
						</div>
					</div>
				</div>

				{/* Documents skeleton - matches document card layout */}
				<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
					<div className="space-y-4">
						{/* Document card skeletons */}
						{Array.from({ length: 3 }).map((_, i) => (
							<div
								key={i}
								className="overflow-hidden rounded-lg border bg-card p-0"
							>
								<div className="flex items-center gap-4 p-4">
									{/* File icon skeleton */}
									<Skeleton className="h-9 w-9 rounded-lg" />

									{/* Document info skeleton */}
									<div className="min-w-0 flex-1">
										<div className="mb-1 flex items-center gap-2">
											<Skeleton className="h-5 w-48" />
											<div className="flex items-center gap-2">
												<Skeleton className="h-5 w-12 rounded-full" />
												<Skeleton className="h-5 w-16 rounded-full" />
											</div>
										</div>
										<Skeleton className="h-4 w-32" />
									</div>

									{/* Actions skeleton */}
									<div className="flex items-center gap-1">
										{/* Signatory count skeleton */}
										<Skeleton className="mr-2 h-6 w-8 rounded-md" />
										{/* Action buttons skeleton */}
										<div className="flex items-center rounded-md border">
											<Skeleton className="h-8 w-8 rounded-none" />
											<Skeleton className="h-8 w-8 rounded-none" />
											<Skeleton className="h-8 w-8 rounded-none" />
											<Skeleton className="h-8 w-8 rounded-none" />
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Documents count skeleton */}
				<div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
					<Skeleton className="h-4 w-40" />
				</div>
			</div>
		</>
	)
}
