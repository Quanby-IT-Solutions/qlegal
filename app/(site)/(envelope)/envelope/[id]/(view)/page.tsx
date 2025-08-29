import { SiteNavbar } from "@/core/components/navbar/site-navbar"

import { HydrateClient, trpc } from "@/services/trpc/server"

import { EnvelopeViewPage } from "@/features/envelopes-lite/components/envelope-view-page"

export default async function Page({
	params
}: {
	params: Promise<{ envelopeId: string }>
}) {
	const { envelopeId } = await params

	// Only prefetch, let the client component handle the data
	await trpc.envelopeLite.getEnvelopeById.prefetch({ envelopeId })
	await trpc.envelopeLite.getEnvelopeDocuments.prefetch({ envelopeId })

	return (
		<HydrateClient>
			<SiteNavbar
				items={[
					{ label: "Envelopes", url: "/envelopes" },
					{ label: "Document View", url: `/envelopes/${envelopeId}` }
				]}
			/>
			<EnvelopeViewPage envelopeId={envelopeId} />
		</HydrateClient>
	)
}
