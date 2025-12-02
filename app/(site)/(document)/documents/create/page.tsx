import { SiteNavbar } from "@/core/components/navbar/site-navbar"

import { HydrateClient } from "@/services/trpc/server"

import { CreateEnvelopePage } from "@/features/envelopes-lite/components/create-envelope-page"

export default async function Page() {
	return (
		<HydrateClient>
			<SiteNavbar
				items={[
					{ label: "Documents", url: "/documents" },
					{ label: "Create Envelope", url: "/documents/create" },
				]}
			/>
			<CreateEnvelopePage />
		</HydrateClient>
	)
}

