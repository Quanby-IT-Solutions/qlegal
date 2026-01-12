import { PageHeader } from "@/core/components/navbar/page-header"

import { HydrateClient } from "@/services/trpc/server"

import { CreateEnvelopePage } from "@/features/envelopes-lite/components/create-envelope-page"

export default async function Page() {
	return (
		<HydrateClient>
			<div className="flex flex-1 flex-col">
				<PageHeader
					items={[{ label: "Documents", href: "/documents" }, { label: "Create Envelope" }]}
				/>
				<CreateEnvelopePage />
			</div>
		</HydrateClient>
	)
}
