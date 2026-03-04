"use client"

import { useState } from "react"
import { Diamond01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { SidebarGroup } from "@/core/components/animate-ui/components/radix/sidebar"
import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"

export const SidebarPlanCard = () => {
	const [open, setOpen] = useState(false)

	return (
		<SidebarGroup className="mt-auto">
			<div className="group-data-[collapsible=icon]/sidebar-wrapper:hidden">
				<div className="border-sidebar-border/60 space-y-3 rounded-lg border bg-gradient-to-br from-slate-400/15 via-slate-300/10 to-slate-400/15 p-3 backdrop-blur-md">
					<div className="flex items-center gap-2">
						<div className="bg-primary/10 text-primary rounded-md p-1.5">
							<HugeiconsIcon icon={Diamond01Icon} size={16} />
						</div>
						<p className="text-sm font-semibold">Want to be an ENP?</p>
					</div>
					<p className="text-muted-foreground text-xs leading-relaxed">
						Unlock advanced legal workflows and premium collaboration tools.
					</p>
					<Button size="sm" className="w-full" onClick={() => setOpen(true)}>
						Learn More
					</Button>
				</div>
			</div>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Choose a plan that fits your legal team</DialogTitle>
						<DialogDescription>
							Scale from solo practice to multi-office operations with the right toolkit.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 text-sm">
						<div className="rounded-lg border p-3">
							<p className="font-semibold">Pro Plan</p>
							<p className="text-muted-foreground text-xs">
								Unlimited sessions, priority support, and advanced document automation.
							</p>
						</div>
						<div className="rounded-lg border p-3">
							<p className="font-semibold">Enterprise Plan</p>
							<p className="text-muted-foreground text-xs">
								Custom roles, compliance controls, and dedicated account management.
							</p>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setOpen(false)}>
							Close
						</Button>
						<Button onClick={() => setOpen(false)}>Contact Sales</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</SidebarGroup>
	)
}
