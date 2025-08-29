"use client"

import { SignatureMeetingScheduler } from "@/features/meetings/components/signature-meeting-scheduler"

import { ToSignList } from "./to-sign-list"

export function ToSignPage() {
	return (
		<div className="container mx-auto py-6">
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Documents to Sign
					</h1>
					<p className="text-muted-foreground">
						View and sign documents that have been shared with you.
					</p>
				</div>

				{/* Signature Meeting Scheduler */}
				<SignatureMeetingScheduler />

				<ToSignList />
			</div>
		</div>
	)
}
