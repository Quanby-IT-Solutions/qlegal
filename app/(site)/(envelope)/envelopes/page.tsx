import { SiteNavbar } from "@/core/components/navbar/site-navbar"

import { EnvelopesPage } from "@/features/envelopes-lite/components/envelopes-page"

export default async function Page() {
	return (
		<>
			<SiteNavbar items={[{ label: "Envelopes", url: "/envelopes" }]} />
			<EnvelopesPage />
		</>
	)
}
