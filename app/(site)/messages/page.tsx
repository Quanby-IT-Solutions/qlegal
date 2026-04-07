import { Suspense } from "react"

import { MessagesView } from "@/features/messages/components/messages-view"

function MessagesPageSkeleton() {
	return (
		<div className="bg-background flex h-screen">
			<div className="flex w-80 flex-col border-r p-4">
				<div className="bg-muted mb-4 h-10 w-full animate-pulse rounded-md" />
				<div className="bg-muted mb-2 h-16 w-full animate-pulse rounded-md" />
				<div className="bg-muted mb-2 h-16 w-full animate-pulse rounded-md" />
				<div className="bg-muted h-16 w-full animate-pulse rounded-md" />
			</div>
			<div className="flex flex-1 items-center justify-center">
				<p className="text-muted-foreground">Loading messages...</p>
			</div>
		</div>
	)
}

export default function MessagesPage() {
	return (
		<Suspense fallback={<MessagesPageSkeleton />}>
			<MessagesView />
		</Suspense>
	)
}
