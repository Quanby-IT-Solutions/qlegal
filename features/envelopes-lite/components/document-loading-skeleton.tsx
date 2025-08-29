"use client"

import { Card, CardContent } from "@/core/components/ui/card"

export function DocumentLoadingSkeleton() {
	return (
		<div className="space-y-4">
			{Array.from({ length: 6 }).map((_, i) => (
				<Card key={i}>
					<CardContent className="p-4">
						<div className="flex items-center gap-4">
							<div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
							<div className="flex-1 space-y-2">
								<div className="flex items-center gap-2">
									<div className="h-4 w-32 animate-pulse rounded bg-muted" />
									<div className="h-5 w-12 animate-pulse rounded bg-muted" />
									<div className="h-5 w-16 animate-pulse rounded bg-muted" />
								</div>
								<div className="h-3 w-48 animate-pulse rounded bg-muted" />
							</div>
							<div className="h-6 w-6 animate-pulse rounded bg-muted" />
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	)
}
