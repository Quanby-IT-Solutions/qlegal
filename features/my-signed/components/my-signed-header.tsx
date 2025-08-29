"use client"

interface MySignedHeaderProps {
	totalCount: number
}

export function MySignedHeader({ totalCount }: MySignedHeaderProps) {
	return (
		<div className="border-b bg-background backdrop-blur dark:bg-muted/60">
			<div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
				{/* Page Title */}
				<div className="mb-6">
					<h1 className="text-2xl font-medium text-foreground">
						My Signed Documents
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						View and manage documents you have signed ({totalCount} total)
					</p>
				</div>
			</div>
		</div>
	)
}
