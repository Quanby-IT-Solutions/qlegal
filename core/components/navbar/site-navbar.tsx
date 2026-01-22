"use client"

import { type Route } from "next"
import { Fragment } from "react"
import { MenuIcon } from "lucide-react"

import { SidebarTrigger } from "@/core/components/animate-ui/components/radix/sidebar"
import { ModeToggle } from "@/core/components/mode-toggle"
import { Button } from "@/core/components/ui/button"
import { Separator } from "@/core/components/ui/separator"
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/core/components/ui/sheet"
import { useIsMobile } from "@/core/hooks/use-mobile"
import { cn } from "@/core/lib/utils"

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/features/home/components/ui/breadcrumb"

import { SiteUser } from "./site-user"

interface SiteNavbarProps {
	items?: {
		label: string
		url?: Route
	}[]
	showUserMenu?: boolean
}

export function SiteNavbar({ items, showUserMenu = true }: SiteNavbarProps) {
	const isMobile = useIsMobile()
	return (
		<nav className="bg-background border-b">
			<div className="mx-auto flex h-16 items-center justify-between px-2 md:px-4">
				<div className="flex items-center gap-2">
					<SidebarTrigger className="-ml-1" />
					<Separator orientation="vertical" className="mr-2 h-4" />

					{items && (
						<>
							<Breadcrumb className="hidden md:block">
								<BreadcrumbList>
									{items.map(({ label, url }, index, array) => (
										<Fragment key={index}>
											<BreadcrumbItem>
												{url ? (
													<BreadcrumbLink href={url}>{label}</BreadcrumbLink>
												) : (
													<BreadcrumbPage>{label}</BreadcrumbPage>
												)}
											</BreadcrumbItem>
											{index < array.length - 1 && <BreadcrumbSeparator />}
										</Fragment>
									))}
								</BreadcrumbList>
							</Breadcrumb>
						</>
					)}
				</div>
				<div className="flex items-center gap-2">
					<ModeToggle />

					{showUserMenu && !isMobile && <SiteUser />}

					{isMobile && (
						<Sheet>
							<SheetTrigger asChild>
								<Button variant="ghost" size="icon" className={cn("size-8")}>
									<MenuIcon className="size-5 shrink-0" />
								</Button>
							</SheetTrigger>
							<SheetContent side="left">
								<SheetHeader>
									<SheetTitle>Are you absolutely sure?</SheetTitle>
									<SheetDescription>
										This action cannot be undone. This will permanently delete your account and
										remove your data from our servers.
									</SheetDescription>
								</SheetHeader>
							</SheetContent>
						</Sheet>
					)}

					{showUserMenu && !isMobile && (
						<div className="h-6">
							<Separator className="h-full" orientation="vertical" />
						</div>
					)}
				</div>
			</div>
		</nav>
	)
}
