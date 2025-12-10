import { SiteNavbar } from "@/core/components/navbar/site-navbar"

import { HydrateClient, trpc } from "@/services/trpc/server"

import { CompletedDocumentsPage } from "@/features/envelopes-lite/components/completed-documents-page"

export default async function Page() {
	// Prefetch completed documents data with pagination
	await trpc.envelopeLite.getCompletedDocuments.prefetch({ page: 1, limit: 20 })

	return (
		<HydrateClient>
			<SiteNavbar
				items={[
					{ label: "Documents", url: "/documents" },
					{ label: "Completed", url: "/documents/completed" },
				]}
			/>
			<CompletedDocumentsPage />
		</HydrateClient>
	)
}

