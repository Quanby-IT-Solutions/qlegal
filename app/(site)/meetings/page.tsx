"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { History, PenTool, Video } from "lucide-react"

import { PageHeader } from "@/core/components/navbar/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { useHydrated } from "@/core/hooks/use-hydrated"

import { ActiveNotarizationsSection } from "@/features/meetings/components/active-notarizations-section"
import { HistoryNotarizationsSection } from "@/features/meetings/components/history-notarizations-section"
import { MeetingsListSection } from "@/features/meetings/components/meetings-list-section"

type TabValue = "meetings" | "active" | "history"

export default function MeetingsPage() {
	const searchParams = useSearchParams()
	const router = useRouter()
	const hydrated = useHydrated()

	// Initialize with default to avoid hydration mismatch
	// Will be updated from URL params after hydration
	const [activeTab, setActiveTab] = useState<TabValue>("meetings")

	// Only read from URL after component hydrates (client-side only)
	useEffect(() => {
		if (!hydrated) return
		const tabParam = searchParams?.get("tab")
		const newTab: TabValue = tabParam === "active" || tabParam === "history" ? tabParam : "meetings"
		setActiveTab(newTab)
	}, [searchParams, hydrated])

	const handleTabChange = (value: string) => {
		const newTab = value as TabValue
		setActiveTab(newTab)

		// Update URL without navigation
		const params = new URLSearchParams(searchParams?.toString())
		if (newTab === "meetings") {
			params.delete("tab")
		} else {
			params.set("tab", newTab)
		}
		const newUrl = params.toString() ? `/meetings?${params.toString()}` : "/meetings"
		router.push(newUrl as any)
	}

	return (
		<div className="flex flex-1 flex-col">
			<PageHeader
				items={[
					{ label: "Meetings & Notarizations", href: "/meetings" },
					{
						label:
							activeTab === "meetings" ? "Meetings" : activeTab === "active" ? "Active" : "History",
					},
				]}
			/>

			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="mx-auto max-w-7xl space-y-8">
					{/* Header */}
					<div className="space-y-2">
						<h1 className="text-3xl font-bold tracking-tight">Meetings & Notarizations</h1>
						<p className="text-muted-foreground mt-2">
							Manage your video meetings and notarization sessions
						</p>
					</div>

					<Tabs
						value={hydrated ? activeTab : "meetings"}
						onValueChange={handleTabChange}
						className="space-y-8"
					>
						<TabsList className="grid w-full max-w-2xl grid-cols-3">
							<TabsTrigger value="meetings" className="gap-2">
								<Video className="size-4" />
								Video Meetings
							</TabsTrigger>
							<TabsTrigger value="active" className="gap-2">
								<PenTool className="size-4" />
								Active Notarizations
							</TabsTrigger>
							<TabsTrigger value="history" className="gap-2">
								<History className="size-4" />
								History
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
		</div>
	)
}
