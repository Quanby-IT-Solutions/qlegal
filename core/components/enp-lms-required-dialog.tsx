"use client"

import type { Route } from "next"
import Link from "next/link"

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/core/components/ui/alert-dialog"
import { Button } from "@/core/components/ui/button"
import { ENP_COMMISSION_ACTIVE_REQUIRED_MESSAGE } from "@/core/lib/enp-lms-guard"

interface EnpLmsRequiredDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	title?: string
	description?: string
	courseHref?: Route
}

const DEFAULT_TITLE = "ENP approval required"
const COURSE_PATH = "/auth/legal-registration/course" as const satisfies Route

export function EnpLmsRequiredDialog({
	open,
	onOpenChange,
	title = DEFAULT_TITLE,
	description = ENP_COMMISSION_ACTIVE_REQUIRED_MESSAGE,
	courseHref = COURSE_PATH,
}: EnpLmsRequiredDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Close</AlertDialogCancel>
					<Button asChild>
						<Link href={courseHref}>Open ENP course / accreditation</Link>
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
