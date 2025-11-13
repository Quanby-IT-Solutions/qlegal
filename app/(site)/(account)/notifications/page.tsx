import { type Route } from "next"
import { SiteNavbar } from "@/core/components/navbar/site-navbar"
import { Card, CardContent } from "@/core/components/ui/card"
import { Bell } from "lucide-react"

export default function Page() {
	return (
		<>
			<SiteNavbar 
				items={[
					{ label: "Notifications", url: "/notifications" as Route }
				]} 
			/>
			
			<div className="min-h-screen bg-muted/30">
				<main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
					<div className="mb-8 space-y-2">
						<h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
						<p className="text-muted-foreground text-sm">
							Stay updated with your latest activities and alerts.
						</p>
					</div>

					<Card>
						<CardContent className="py-12 text-center">
							<Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
							<h3 className="text-lg font-medium mb-2">No notifications yet</h3>
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
