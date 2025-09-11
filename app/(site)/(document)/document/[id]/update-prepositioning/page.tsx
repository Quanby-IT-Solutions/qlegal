import { SiteNavbar } from "@/core/components/navbar/site-navbar"

import { HydrateClient, trpc } from "@/services/trpc/server"

import { UpdatePrepositioningClient } from "@/features/signature-lite/components/update-prepositioning-client"

export default async function UpdatePrepositioningPage({
	params
}: {
	params: Promise<{ envelopeId: string; documentId: string }>
}) {
	const { envelopeId, documentId } = await params

	// Prefetch data for better performance
	await trpc.signatureLite.prepositioning.getDocumentWithFields.prefetch({
		documentId
	})
	await trpc.signatureLite.prepositioning.getEnvelopeWithRecipients.prefetch({
		envelopeId,
		documentId
	})

	// Get document and envelope data for navigation
	const documentData = await trpc.signatureLite.prepositioning.getDocumentWithFields({
		documentId
	})
	const envelope = await trpc.signatureLite.prepositioning.getEnvelopeWithRecipients({
		envelopeId,
		documentId
	})

	const resolvedEnvelopeTitle = envelope?.title ?? envelopeId
	const resolvedDocumentTitle = documentData?.name ?? documentId

	return (
		<HydrateClient>
			<SiteNavbar
				items={[
					{ label: "Envelopes", url: "/envelopes" },
					{ label: resolvedEnvelopeTitle, url: `/envelope/${envelopeId}` },
					{
						label: resolvedDocumentTitle,
						url: `/envelope/${envelopeId}/`
					},
					{
						label: "Update Positioning",
						url: `/envelope/${envelopeId}/document/${documentId}/update-prepositioning`
					}
				]}
			/>
			<UpdatePrepositioningClient
				envelopeId={envelopeId}
				documentId={documentId}
			/>
		</HydrateClient>
	)
}
