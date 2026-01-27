"use client"

import { PageHeader } from "@/core/components/navbar/page-header"

import { BrowseENPsTab } from "@/features/quick-match/components/browse-enps-tab"

export default function BrowsePage() {
	return (
		<div className="flex flex-1 flex-col">
			<PageHeader
				items={[
					{ label: "Browse", href: "/browse" },
				]}
			/>

			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="mx-auto max-w-6xl space-y-8">
					<div>
						<h1 className="text-3xl font-bold tracking-tight">Browse Available Lawyers</h1>
						<p className="text-muted-foreground mt-2">
							Browse our directory of available lawyers and select the one that best suits your needs.
						</p>
					</div>

					<BrowseENPsTab />
				</div>
			</main>
		</div>
	)
}
