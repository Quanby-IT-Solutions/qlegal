import type { Route } from "next"

import { SiteNavbar } from "@/core/components/navbar/site-navbar"

import { HydrateClient, trpc } from "@/services/trpc/server"

import { EnvelopeViewPage } from "@/features/envelopes-lite/components/envelope-view-page"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
	const { id: envelopeId } = await params

	// Only prefetch, let the client component handle the data
	await trpc.envelopeLite.getEnvelopeById.prefetch({ envelopeId })
	// Note: getEnvelopeDocuments procedure doesn't exist yet, so we'll skip this for now
	// await trpc.envelopeLite.getEnvelopeDocuments.prefetch({ envelopeId })

		// Construct route with proper typing
		const envelopeUrl: Route = (`/envelope/${envelopeId}` as unknown) as Route

		return (
		<HydrateClient>
			<SiteNavbar
				items={[
					{ label: "Envelopes", url: "/envelopes" as Route },
					{ label: "Document View", url: envelopeUrl },
				]}
			/>
			<EnvelopeViewPage envelopeId={envelopeId} />
		</HydrateClient>
	)
}
