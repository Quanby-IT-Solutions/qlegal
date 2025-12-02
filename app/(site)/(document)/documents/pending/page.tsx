import { SiteNavbar } from "@/core/components/navbar/site-navbar"

import { HydrateClient, trpc } from "@/services/trpc/server"

import { PendingDocumentsPage } from "@/features/envelopes-lite/components/pending-documents-page"

export default async function Page() {
	// Prefetch pending documents data
	await trpc.envelopeLite.getPendingDocuments.prefetch()

	return (
		<HydrateClient>
			<SiteNavbar
				items={[
					{ label: "Documents", url: "/documents" },
					{ label: "Pending", url: "/documents/pending" },
				]}
			/>
			<PendingDocumentsPage />
		</HydrateClient>
	)
}

