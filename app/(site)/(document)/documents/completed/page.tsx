import { PageHeader } from "@/core/components/navbar/page-header"

import { HydrateClient, trpc } from "@/services/trpc/server"

import { CompletedDocumentsPage } from "@/features/envelopes-lite/components/completed-documents-page"

export default async function Page() {
	// Prefetch completed documents data with pagination
	await trpc.envelopeLite.getCompletedDocuments.prefetch({ page: 1, limit: 20 })

	return (
		<HydrateClient>
			<div className="flex flex-1 flex-col">
				<PageHeader items={[{ label: "Documents", href: "/documents" }, { label: "Completed" }]} />
				<CompletedDocumentsPage />
			</div>
		</HydrateClient>
	)
}
