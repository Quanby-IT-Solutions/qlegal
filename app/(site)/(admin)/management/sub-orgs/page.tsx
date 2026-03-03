import { SidebarTrigger } from "@/core/components/animate-ui/components/radix/sidebar"
import { ModeToggle } from "@/core/components/mode-toggle"
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from "@/core/components/ui/breadcrumb"
import { Separator } from "@/core/components/ui/separator"

import { SubOrgsDashboard } from "@/features/sub-orgs/components/sub-orgs-dashboard"

export default function SubOrgsPage() {
	return (
		<>
			<header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
				<div className="flex flex-1 items-center justify-between px-4">
					<div className="flex items-center gap-2">
						<SidebarTrigger className="-ml-1" />
						<Separator orientation="vertical" className="mr-2 h-4" />
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem>
									<BreadcrumbPage>Sub-Orgs</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>
					<ModeToggle />
				</div>
			</header>
			<SubOrgsDashboard />
		</>
	)
}
