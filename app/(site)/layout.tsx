import { cookies } from "next/headers"

import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/core/components/animate-ui/components/radix/sidebar"
import { SiteSidebar } from "@/core/components/navbar/site-sidebar"

export default async function Layout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const cookieStore = await cookies()
	const defaultOpen = cookieStore.get("sidebar_state")?.value === "true"

	return (
		<SidebarProvider defaultOpen={defaultOpen}>
			<SiteSidebar />
			<SidebarInset>
				<main>
					<SidebarTrigger />
					{children}
				</main>
			</SidebarInset>
		</SidebarProvider>
	)
}
