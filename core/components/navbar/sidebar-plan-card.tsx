"use client"

import { useState } from "react"
import { BookOpen01Icon, Diamond01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight } from "lucide-react"

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/core/components/animate-ui/components/animate/tooltip"
import {
	SidebarGroup,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/core/components/animate-ui/components/radix/sidebar"
import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"

export const SidebarPlanCard = () => {
	const [open, setOpen] = useState(false)
	const { state: sidebarState } = useSidebar()
	const handleJoinCourse = () => {
		setOpen(false)
	}

	return (
		<SidebarGroup>
			{sidebarState === "collapsed" ? (
				<SidebarMenu>
					<SidebarMenuItem>
						<Tooltip side="right" align="center">
							<TooltipTrigger asChild>
								<SidebarMenuButton onClick={() => setOpen(true)}>
									<HugeiconsIcon icon={BookOpen01Icon} size={16} />
								</SidebarMenuButton>
							</TooltipTrigger>
							<TooltipContent>
								<p>Want to be an ENP?</p>
							</TooltipContent>
						</Tooltip>
					</SidebarMenuItem>
				</SidebarMenu>
			) : (
				<div className="border-sidebar-border/60 space-y-3 rounded-lg border bg-gradient-to-br from-slate-400/15 via-slate-300/10 to-slate-400/15 p-3 backdrop-blur-md">
					<div className="flex items-center gap-2">
						<div className="bg-primary/10 text-primary rounded-md p-1.5">
							<HugeiconsIcon icon={Diamond01Icon} size={16} />
						</div>
						<p className="text-sm font-semibold">Want to be an ENP?</p>
					</div>
					<p className="text-muted-foreground text-xs leading-relaxed">
						Unlock advanced legal workflows by finishing our ENP course.
					</p>
					<Button size="sm" className="w-full" onClick={() => setOpen(true)}>
						Learn More
					</Button>
				</div>
			)}

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="bg-card max-w-md border-0 shadow-lg">
					<DialogHeader className="space-y-4">
						<DialogTitle className="text-2xl font-semibold">Want to become an ENP?</DialogTitle>
						<DialogDescription className="text-muted-foreground text-base">
							Finish this course to become an ENP and unlock advanced legal workflows and premium
							collaboration tools.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-3 pt-4">
						<button
							onClick={() => setOpen(false)}
							className="group bg-card w-full rounded-lg border p-4 transition-all duration-200 hover:border-gray-300 active:scale-95"
						>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="rounded-lg bg-orange-50 p-2 dark:bg-orange-900/20">
										<HugeiconsIcon icon={BookOpen01Icon} size={20} className="text-orange-600" />
									</div>
									<div className="text-left">
										<p className="font-medium text-orange-600">ENP Course</p>
									</div>
								</div>
								<span className="text-primary flex items-center gap-2 font-medium">
									Course Preview
									<ArrowRight className="h-5 w-5 text-gray-400" />
								</span>
							</div>
						</button>
					</div>
				</DialogContent>
			</Dialog>
		</SidebarGroup>
	)
}
