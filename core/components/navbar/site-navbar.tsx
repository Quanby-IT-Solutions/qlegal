"use client"

import { type Route } from "next"
import Link from "next/link"
import { Fragment } from "react"
import { MenuIcon } from "lucide-react"

import { ModeToggle } from "@/core/components/mode-toggle"
import { QuanbyLogo } from "@/core/components/quanby-logo"
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
}

export function SiteNavbar({ items }: SiteNavbarProps) {
	const isMobile = useIsMobile()
	return (
		<nav className="bg-background border-b">
			<div className="mx-auto flex h-16 items-center justify-between px-4 md:px-8">
				<div className="flex items-center gap-2">
					<Link
						href="/"
						className="hover:bg-muted/50 flex items-center gap-2 rounded-lg p-1 transition-colors md:gap-3"
					>
						<div className="flex gap-x-2">
							<QuanbyLogo className="size-6 shrink-0" />
							<span className="from-foreground to-foreground/80 bg-linear-to-r bg-clip-text text-lg font-bold leading-tight tracking-tight text-transparent">
								QSign
							</span>
						</div>
					</Link>

					{items && (
						<>
							<Separator
								orientation="vertical"
								className="mx-2 hidden data-[orientation=vertical]:h-4 md:block"
							/>
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

					<div className="h-6">
						<Separator className="h-full" orientation="vertical" />
					</div>

					{!isMobile && <SiteUser />}

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
				</div>
			</div>
		</nav>
	)
}
