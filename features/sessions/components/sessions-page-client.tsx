"use client"

import type { Route } from "next"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import { PageHeader } from "@/core/components/navbar/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"

import { ActiveNotarizationsSection } from "@/features/sessions/components/active-notarizations-section"
import { HistoryNotarizationsSection } from "@/features/sessions/components/history-notarizations-section"
import { MeetingsListSection } from "@/features/sessions/components/meetings-list-section"

type TabValue = "meetings" | "active" | "history"

interface SessionsPageClientProps {
	initialTab: TabValue
}

export function SessionsPageClient({ initialTab }: SessionsPageClientProps) {
	const searchParams = useSearchParams()
	const router = useRouter()

	const [activeTab, setActiveTab] = useState<TabValue>(initialTab)

	useEffect(() => {
		const tabParam = searchParams?.get("tab")
		const newTab: TabValue = tabParam === "active" || tabParam === "history" ? tabParam : "meetings"
		setActiveTab(newTab)
	}, [searchParams])

	const handleTabChange = (value: string) => {
		const newTab = value as TabValue
		setActiveTab(newTab)

		const params = new URLSearchParams(searchParams?.toString())
		if (newTab === "meetings") {
			params.delete("tab")
		} else {
			params.set("tab", newTab)
		}
		const newUrl = (params.toString() ? `/sessions?${params.toString()}` : "/sessions") as Route
		router.push(newUrl)
	}

	return (
		<>
			<PageHeader
				items={[
					{ label: "Sessions", href: "/sessions" },
					{
						label:
							activeTab === "meetings" ? "Ongoing" : activeTab === "active" ? "Upcoming" : "Past",
					},
				]}
			/>

			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="mx-auto max-w-7xl space-y-8">
					<div className="space-y-2">
						<h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
						<p className="text-muted-foreground mt-2">
							Manage your video meetings and notarization sessions
						</p>
					</div>

					<Tabs
						value={activeTab}
						onValueChange={handleTabChange}
						className="space-y-3"
					>
						<TabsList className="grid w-full max-w-2xl grid-cols-3">
							<TabsTrigger value="meetings" className="gap-2">
								Ongoing
							</TabsTrigger>
							<TabsTrigger value="active" className="gap-2">
								Upcoming
							</TabsTrigger>
							<TabsTrigger value="history" className="gap-2">
								Past
							</TabsTrigger>
						</TabsList>

						<TabsContent value="meetings" className="mt-0">
							<MeetingsListSection />
						</TabsContent>

						<TabsContent value="active" className="mt-0">
							<ActiveNotarizationsSection />
						</TabsContent>

						<TabsContent value="history" className="mt-0">
							<HistoryNotarizationsSection />
						</TabsContent>
					</Tabs>
				</div>
			</main>
		</>
	)
}
