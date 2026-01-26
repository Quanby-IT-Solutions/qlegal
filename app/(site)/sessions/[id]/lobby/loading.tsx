import { Card, CardContent, CardHeader } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"

export default function MeetingLobbyLoading() {
	return (
		<>
			{/* Fixed overlay that covers EVERYTHING including sidebar */}
			<div className="bg-background fixed inset-0 z-[9999]">
				<div className="from-background via-muted/20 to-background flex min-h-screen items-center justify-center bg-gradient-to-br px-4 py-10">
					<div className="w-full max-w-2xl space-y-6">
						{/* Logo Skeleton */}
						<div className="flex justify-center">
							<Skeleton className="size-16 rounded-full" />
						</div>

						{/* Card Skeleton */}
						<Card className="w-full shadow-xl">
							<CardHeader className="space-y-4">
								<div className="flex items-start justify-between">
									<div className="flex items-center gap-3">
										<Skeleton className="size-12 rounded-xl" />
										<div className="space-y-2">
											<Skeleton className="h-7 w-48" />
											<Skeleton className="h-4 w-64" />
										</div>
									</div>
								</div>
							</CardHeader>
							<CardContent className="space-y-4">
								{/* Option 1 Skeleton */}
								<div className="rounded-xl border-2 p-6">
									<div className="mb-4 flex items-start gap-4">
										<Skeleton className="size-10 shrink-0 rounded-lg" />
										<div className="flex-1 space-y-2">
											<Skeleton className="h-5 w-32" />
											<Skeleton className="h-4 w-full" />
										</div>
									</div>
									<Skeleton className="h-11 w-full rounded-md" />
								</div>

								{/* Option 2 Skeleton */}
								<div className="rounded-xl border-2 p-6">
									<div className="mb-4 flex items-start gap-4">
										<Skeleton className="size-10 shrink-0 rounded-lg" />
										<div className="flex-1 space-y-2">
											<Skeleton className="h-5 w-40" />
											<Skeleton className="h-4 w-full" />
										</div>
									</div>
									<Skeleton className="h-11 w-full rounded-md" />
								</div>
							</CardContent>
						</Card>

						{/* Footer Skeleton */}
						<div className="space-y-3 text-center">
							<Skeleton className="mx-auto h-8 w-48 rounded-full" />
							<Skeleton className="mx-auto h-4 w-64" />
						</div>
					</div>
				</div>
			</div>
		</>
	)
}
