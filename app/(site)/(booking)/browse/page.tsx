"use client"

import { useState } from "react"

import { SiteNavbar } from "@/core/components/navbar/site-navbar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"

import { MessageFirstTab } from "@/features/messages/components/message-first-tab"
import { BrowseENPsTab } from "@/features/quick-match/components/browse-enps-tab"
import { QuickMatchPanel } from "@/features/quick-match/components/quick-match-panel"

export default function BrowsePage() {
	const [activeTab, setActiveTab] = useState("browse")

	return (
		<>
			<SiteNavbar
				items={[
					{ label: "Find & Book", url: "/browse" },
					{ label: "Select Notary", url: "/browse" },
				]}
			/>

			<div className="bg-muted/30 min-h-screen">
				<div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
					{/* Header */}
					<div className="mb-8">
						<h1 className="text-3xl font-bold tracking-tight">Find & Book a Notary</h1>
						<p className="text-muted-foreground mt-2">
							Choose how you want to find a notary public. Browse our directory, use Quick Match for
							instant pairing, or message first to discuss.
						</p>
					</div>

					{/* Tabs */}
					<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
						<TabsList className="grid w-full grid-cols-3">
							<TabsTrigger value="browse">Browse & Select</TabsTrigger>
							<TabsTrigger value="quick-match">Quick Match</TabsTrigger>
							<TabsTrigger value="message-first">Message First</TabsTrigger>
						</TabsList>

						{/* BROWSE ENPs TAB */}
						<TabsContent value="browse" className="space-y-6">
							<BrowseENPsTab />
						</TabsContent>

						{/* QUICK MATCH TAB */}
						<TabsContent value="quick-match" className="space-y-6">
							<QuickMatchPanel />
						</TabsContent>

						{/* MESSAGE FIRST TAB */}
						<TabsContent value="message-first" className="space-y-6">
							<MessageFirstTab />
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</>
	)
}
