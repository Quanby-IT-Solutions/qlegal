"use client"

import { Button } from "@/core/components/ui/button"

interface EnvelopeErrorBannerProps {
	isError: boolean
	onRetry: () => void
}

export function EnvelopeErrorBanner({ isError, onRetry }: EnvelopeErrorBannerProps) {
	if (!isError) {
		return null
	}

	return (
		<div className="border-b bg-orange-50 dark:bg-orange-950/50">
			<div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="h-1.5 w-1.5 rounded-full bg-orange-500"></div>
						<span className="text-sm text-orange-800 dark:text-orange-200">Connection failed</span>
						<span className="text-xs text-orange-600 dark:text-orange-400">
							Showing cached data
						</span>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={onRetry}
						className="h-6 px-2 text-xs text-orange-700 hover:bg-orange-100 dark:text-orange-300 dark:hover:bg-orange-900/40"
					>
						Retry
					</Button>
				</div>
			</div>
		</div>
	)
}
