"use client"

import { type Route } from "next"
import { useState } from "react"
import { Bell } from "lucide-react"

import { Tabs, TabsList, TabsTrigger } from "@/core/components/animate-ui/components/radix/tabs"
import { SiteNavbar } from "@/core/components/navbar/site-navbar"
import { Card, CardContent } from "@/core/components/ui/card"

type NotificationTab = "all" | "unread" | "read"

export default function Page() {
	const [activeTab, setActiveTab] = useState<NotificationTab>("read")

	return (
		<>
			<SiteNavbar
				items={[{ label: "Notifications", url: "/notifications" as Route }]}
				showUserMenu={false}
			/>

			<div className="bg-muted/30 min-h-screen">
				<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
					<div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
						<div className="space-y-2">
							<h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
							<p className="text-muted-foreground text-sm">
								Stay updated with your latest activities and alerts.
							</p>
						</div>

						<Tabs
							value={activeTab}
							onValueChange={value => setActiveTab(value as NotificationTab)}
							className="w-full md:w-auto"
						>
							<TabsList className="bg-transparent">
								<TabsTrigger value="all">All</TabsTrigger>
								<TabsTrigger value="unread">Unread (0)</TabsTrigger>
								<TabsTrigger value="read">Read</TabsTrigger>
								<button
									type="button"
									className="text-muted-foreground border-muted-foreground/40 hover:bg-muted/40 ml-4 inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors"
								>
									Mark all read
								</button>
							</TabsList>
						</Tabs>
					</div>

					<Card>
						<CardContent className="py-12 text-center">
							<Bell className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
							<h3 className="mb-2 text-lg font-medium">No notifications yet</h3>
							<p className="text-muted-foreground">
								You're all caught up! Notifications will appear here.
							</p>
						</CardContent>
					</Card>
				</main>
			</div>
		</>
	)
}
