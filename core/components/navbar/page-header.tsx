"use client"

import Link from "next/link"
import { type Route } from "next"
import { type UrlObject } from "url"

import { SidebarTrigger } from "@/core/components/animate-ui/components/radix/sidebar"
import { ModeToggle } from "@/core/components/mode-toggle"
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/core/components/ui/breadcrumb"
import { Separator } from "@/core/components/ui/separator"

export interface PageHeaderItem {
	label: string
	href?: Route | UrlObject
}

interface PageHeaderProps {
	items: PageHeaderItem[]
	actions?: React.ReactNode
}

export function PageHeader({ items, actions }: PageHeaderProps) {
	return (
		<header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
			<div className="flex flex-1 items-center gap-2 px-4">
				<SidebarTrigger className="-ml-1" />
				<Separator orientation="vertical" className="mr-2 h-4" />
				<Breadcrumb>
					<BreadcrumbList>
						{items.map((item, index) => {
							const isLast = index === items.length - 1
							return (
								<div className="flex items-center gap-2" key={index}>
									<BreadcrumbItem>
										{isLast || !item.href ? (
											<BreadcrumbPage>{item.label}</BreadcrumbPage>
										) : (
											<BreadcrumbLink asChild>
												<Link href={item.href}>{item.label}</Link>
											</BreadcrumbLink>
										)}
									</BreadcrumbItem>
									{!isLast && <BreadcrumbSeparator />}
								</div>
							)
						})}
					</BreadcrumbList>
				</Breadcrumb>
			</div>
			<div className="flex items-center gap-2 px-4">
				<ModeToggle />
				{actions}
			</div>
		</header>
	)
}
