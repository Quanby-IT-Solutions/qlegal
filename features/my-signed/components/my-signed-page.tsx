"use client"

import { useSession } from "next-auth/react"

import { trpc } from "@/services/trpc/client"

import { MySignedEmptyState } from "./my-signed-empty-state"
import { MySignedHeader } from "./my-signed-header"
import { SignedDocumentCard } from "./signed-document-card"
import { SigningTimelineChart } from "./signing-timeline-chart"

// Types for the envelope and document structure
interface EnvelopeUser {
	id: string
	name: string | null
	email: string | null
}

interface DocumentRecipient {
	id: string
	role: string
	status: string
	userId: string | null
	user: EnvelopeUser | null
}

interface EnvelopeDocument {
	id: string
	name: string
	url: string
	recipients: DocumentRecipient[]
}

interface EnvelopeData {
	id: string
	title: string
	description: string | null
	status: string
	createdAt: Date | string
	createdBy: EnvelopeUser | null
	documents: EnvelopeDocument[]
}

export function MySignedPage() {
	const { data: session, status } = useSession()

	const { data: signedData, isLoading: signedLoading } = trpc.toSign.listEnvelopesToSign.useQuery(
		{
			status: "SIGNED",
			userId: session?.user?.id ?? "",
		},
		{
			enabled: !!session?.user?.id,
			staleTime: 1000 * 60, // 1 minute
		}
	)

	const signedEnvelopes = signedData?.envelopes ?? []
	const isLoading = signedLoading || status === "loading"

	// No filtering needed since search is disabled

	if (isLoading) {
		return (
			<div className="bg-muted dark:bg-background min-h-screen">
				<MySignedHeader totalCount={0} />
				<div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
					<div className="mb-6">
						{session?.user?.id && <SigningTimelineChart userId={session.user.id} />}
					</div>
					<div className="animate-pulse space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="border-border bg-background h-32 rounded-lg border" />
						))}
					</div>
					<div className="animate-pulse space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="border-border bg-background h-32 rounded-lg border" />
						))}
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="bg-muted dark:bg-background min-h-screen">
			<MySignedHeader totalCount={signedEnvelopes.length} />

			<div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
				{/* Signing Timeline Chart */}
				<div className="mb-6">
					{session?.user?.id && <SigningTimelineChart userId={session.user.id} />}
				</div>

				{/* Search Bar */}
				{/* <div className="mb-6">
					<SearchBar
						searchQuery={searchQuery}
						onSearchChange={setSearchQuery}
						placeholder="Search signed documents..."
					/>
				</div> */}

				{/* Main Content */}
				{signedEnvelopes.length === 0 ? (
					<MySignedEmptyState />
				) : (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{signedEnvelopes.map((envelope: EnvelopeData) => (
							<SignedDocumentCard key={envelope.id} envelope={envelope} viewMode="grid" />
						))}
					</div>
				)}
			</div>
		</div>
	)
}
