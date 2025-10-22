"use client"

import { Trash2, UserCheck, UserX } from "lucide-react"

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/core/components/ui/alert-dialog"

interface ConfirmationModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	action: "suspend" | "unsuspend" | "delete"
	userName: string
	onConfirm: () => void
	isLoading?: boolean
}

export function ConfirmationModal({
	open,
	onOpenChange,
	action,
	userName,
	onConfirm,
	isLoading = false,
}: ConfirmationModalProps) {
	const getActionConfig = () => {
		switch (action) {
			case "suspend":
				return {
					title: "Suspend User",
					description: `Are you sure you want to suspend ${userName}? This will prevent them from accessing the platform.`,
					icon: <UserX className="h-4 w-4" />,
					confirmText: "Suspend User",
					variant: "destructive" as const,
				}
			case "unsuspend":
				return {
					title: "Unsuspend User",
					description: `Are you sure you want to unsuspend ${userName}? They will regain access to the platform.`,
					icon: <UserCheck className="h-4 w-4" />,
					confirmText: "Unsuspend User",
					variant: "default" as const,
				}
			case "delete":
				return {
					title: "Delete User",
					description: `Are you sure you want to permanently delete ${userName}? This action cannot be undone and will remove all their data.`,
					icon: <Trash2 className="h-4 w-4" />,
					confirmText: "Delete User",
					variant: "destructive" as const,
				}
		}
	}

	const config = getActionConfig()

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2">
						{config.icon}
						{config.title}
					</AlertDialogTitle>
					<AlertDialogDescription>{config.description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={onConfirm}
						disabled={isLoading}
						className={
							action === "suspend" || action === "delete"
								? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
								: ""
						}
					>
						{isLoading ? "Processing..." : config.confirmText}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
