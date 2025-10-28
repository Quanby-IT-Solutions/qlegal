import { SiteNavbar } from "@/core/components/navbar/site-navbar"

import { LawyersPage } from "@/features/lawyers/components/lawyers-page"

export default function FindALawyerPage() {
	return (
		<>
			<SiteNavbar items={[{ label: "Find a Lawyer", url: "/find-a-lawyer" }]} />
			<LawyersPage />
		</>
	)
}
