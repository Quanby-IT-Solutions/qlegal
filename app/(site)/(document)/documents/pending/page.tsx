import { PageHeader } from "@/core/components/navbar/page-header"

import { HydrateClient, trpc } from "@/services/trpc/server"

import { PendingDocumentsPage } from "@/features/envelopes-lite/components/pending-documents-page"

export default async function Page() {
	// Prefetch pending documents data
	await trpc.envelopeLite.getPendingDocuments.prefetch()

	return (
		<HydrateClient>
			<div className="flex flex-1 flex-col">
				<PageHeader items={[{ label: "Documents", href: "/documents" }, { label: "Pending" }]} />
				<PendingDocumentsPage />
			</div>
		</HydrateClient>
	)
}
