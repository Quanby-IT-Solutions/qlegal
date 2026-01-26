"use client"

import { useState } from "react"
import { Power } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Label } from "@/core/components/ui/label"
import { Switch } from "@/core/components/ui/switch"

import { trpc } from "@/services/trpc/client"

export function AvailabilityToggleCard() {
	const utils = trpc.useUtils()
	const [isChanging, setIsChanging] = useState(false)

	// Get current profile to check availability
	const { data: profile, isLoading } = trpc.enpProfile.getMyProfile.useQuery()

	const updateAvailabilityMutation = trpc.enpProfile.updateAvailability.useMutation({
		onMutate: () => {
			setIsChanging(true)
		},
		onSuccess: data => {
			setIsChanging(false)
			void utils.enpProfile.getMyProfile.invalidate()
			toast.success(
				data.isAvailable
					? "You are now available for bookings"
					: "You are now unavailable for bookings"
			)
		},
		onError: error => {
			setIsChanging(false)
			toast.error(error.message ?? "Failed to update availability")
		},
	})

	const handleToggle = (checked: boolean) => {
		updateAvailabilityMutation.mutate({ available: checked })
	}

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Power className="size-5" />
						Availability Status
					</CardTitle>
					<CardDescription>Loading...</CardDescription>
				</CardHeader>
			</Card>
		)
	}

	if (!profile) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Power className="size-5" />
						Availability Status
					</CardTitle>
					<CardDescription>Profile not found. Please complete your profile first.</CardDescription>
				</CardHeader>
			</Card>
		)
	}

	const isAvailable = profile.isAvailable ?? false

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Power className="size-5" />
					Availability Status
				</CardTitle>
				<CardDescription>
					Control whether you appear in searches and can receive booking requests
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
					<div className="flex-1 space-y-1">
						<Label htmlFor="availability-toggle" className="text-base font-medium">
							{isAvailable ? "Available for Bookings" : "Unavailable"}
						</Label>
						<p className="text-muted-foreground text-sm">
							{isAvailable
								? "You will appear in browse results and can receive Quick Match requests"
								: "You will not appear in searches or receive booking requests"}
						</p>
					</div>
					<Switch
						id="availability-toggle"
						checked={isAvailable}
						onCheckedChange={handleToggle}
						disabled={isChanging}
					/>
				</div>

				{!isAvailable && (
					<Alert>
						<AlertDescription>
							You are currently offline. Toggle availability to start receiving booking requests.
						</AlertDescription>
					</Alert>
				)}

				<div className="text-muted-foreground text-xs">
					<p>
						<strong>Note:</strong> Even when available, you can decline individual requests. This
						setting only controls your visibility in the platform.
					</p>
				</div>
			</CardContent>
		</Card>
	)
}
