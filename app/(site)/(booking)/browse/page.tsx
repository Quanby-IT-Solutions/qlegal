"use client"

import { useState } from "react"

import { PageHeader } from "@/core/components/navbar/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"

import { MessageFirstTab } from "@/features/messages/components/message-first-tab"
import { BrowseENPsTab } from "@/features/quick-match/components/browse-enps-tab"
import { QuickMatchPanel } from "@/features/quick-match/components/quick-match-panel"

export default function BrowsePage() {
	const [activeTab, setActiveTab] = useState("browse")

	return (
		<div className="flex flex-1 flex-col">
			<PageHeader
				items={[
					{ label: "Find & Book", href: "/browse" },
					{ label: "Select Notary", href: "/browse" },
				]}
			/>

			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="mx-auto max-w-6xl space-y-8">
					{/* Header */}
					<div>
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
			</main>
		</div>
	)
}
