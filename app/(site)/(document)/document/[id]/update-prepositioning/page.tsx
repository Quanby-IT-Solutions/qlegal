// import type { Route } from "next"

// import { SiteNavbar } from "@/core/components/navbar/site-navbar"

// import { HydrateClient, trpc } from "@/services/trpc/server"

// import { UpdatePrepositioningClient } from "@/features/signature-lite/components/update-prepositioning-client"

// export default async function UpdatePrepositioningPage({
// 	params,
// }: {
// 	params: Promise<{ envelopeId: string; documentId: string }>
// }) {
// 	const { envelopeId, documentId } = await params

// 	// Prefetch data for better performance
// 	await trpc.signatureLite.prepositioning.getDocumentWithFields.prefetch({
// 		documentId,
// 	})
// 	await trpc.signatureLite.prepositioning.getEnvelopeWithRecipients.prefetch({
// 		envelopeId,
// 		documentId,
// 	})

// 	// Get document and envelope data for navigation
// 	const documentData: { name?: string } | null = await (
// 		trpc.signatureLite.prepositioning.getDocumentWithFields({
// 			documentId,
// 		}) as Promise<{ name?: string }>
// 	).catch(() => null)
// 	const envelope: { title?: string } | null = await (
// 		trpc.signatureLite.prepositioning.getEnvelopeWithRecipients({
// 			envelopeId,
// 			documentId,
// 		}) as Promise<{ title?: string }>
// 	).catch(() => null)

// 	const resolvedEnvelopeTitle = envelope?.title ?? envelopeId
// 	const resolvedDocumentTitle = documentData?.name ?? documentId

// 	// Construct routes with proper typing
// 	const envelopeUrl: Route = (`/envelope/${envelopeId}` as unknown) as Route
// 	const envelopeDocumentUrl: Route = (`/envelope/${envelopeId}/` as unknown) as Route
// 	const updatePrepositioningUrl: Route = (`/envelope/${envelopeId}/document/${documentId}/update-prepositioning` as unknown) as Route

// 	return (
// 		<HydrateClient>
// 			<SiteNavbar
// 				items={[
// 					{ label: "Envelopes", url: "/envelopes" as Route },
// 					{ label: resolvedEnvelopeTitle, url: envelopeUrl },
// 					{
// 						label: resolvedDocumentTitle,
// 						url: envelopeDocumentUrl,
// 					},
// 					{
// 						label: "Update Positioning",
// 						url: updatePrepositioningUrl,
// 					},
// 				]}
// 			/>
// 			<UpdatePrepositioningClient envelopeId={envelopeId} documentId={documentId} />
// 		</HydrateClient>
// 	)
// }

export default function UpdatePrepositioningPage() {
	return null
}
