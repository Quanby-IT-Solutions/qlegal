"use client"

interface MySignedHeaderProps {
	totalCount: number
}

export function MySignedHeader({ totalCount }: MySignedHeaderProps) {
	return (
		<div className="bg-background border-b">
			<div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
				{/* Page Title */}
				<div className="mb-6">
					<h1 className="text-foreground text-2xl font-medium">My Signed Documents</h1>
					<p className="text-muted-foreground mt-1 text-sm">
						View and manage documents you have signed ({totalCount} total)
					</p>
				</div>
			</div>
		</div>
	)
}
