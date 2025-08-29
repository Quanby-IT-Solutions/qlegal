"use client"

import { useState } from "react"
import {
	Activity,
	AlertCircle,
	Calendar,
	CheckCircle,
	Clock,
	Mail,
	MapPin,
	Shield,
	User
} from "lucide-react"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import {
	Avatar,
	AvatarFallback,
	AvatarImage
} from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
// import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle
} from "@/core/components/ui/card"
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger
} from "@/core/components/ui/sheet"

import { trpc } from "@/services/trpc/client"

interface UserProfileSheetProps {
	userId: string
	trigger: React.ReactNode
}

export function UserProfileSheet({ userId, trigger }: UserProfileSheetProps) {
	const [open, setOpen] = useState(false)

	const { data: user, isLoading } = trpc.userManagement.getById.useQuery(
		{ id: userId },
		{ enabled: open }
	)

	const getRoleColor = (role: string) => {
		switch (role) {
			case "client":
				return "bg-blue-100 text-blue-800"
			case "admin":
				return "bg-purple-100 text-purple-800"
			case "super-admin":
				return "bg-red-100 text-red-800"
			default:
				return "bg-gray-100 text-gray-800"
		}
	}

	const getStatusColor = (status: string) => {
		switch (status) {
			case "active":
				return "bg-green-100 text-green-800"
			case "pending":
				return "bg-orange-100 text-orange-800"
			case "suspended":
				return "bg-red-100 text-red-800"
			default:
				return "bg-gray-100 text-gray-800"
		}
	}

	const formatDate = (dateString: string | undefined) => {
		if (!dateString) return "Not available"
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit"
		})
	}

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>{trigger}</SheetTrigger>
			<SheetContent className="w-[400px] overflow-y-auto border-l bg-background sm:w-[540px]">
				<SheetHeader className="sr-only">
					<SheetTitle>User Profile</SheetTitle>
				</SheetHeader>

				<div className="space-y-4 p-4">
					{isLoading ? (
						<div className="space-y-4">
							<div className="mx-auto h-20 w-20 animate-pulse rounded-full bg-muted" />
							<div className="space-y-2">
								<div className="mx-auto h-4 w-32 animate-pulse rounded bg-muted" />
								<div className="mx-auto h-3 w-48 animate-pulse rounded bg-muted" />
							</div>
						</div>
					) : user ? (
						<>
							{/* Profile Header */}
							<div className="space-y-3 text-center">
								<Avatar className="mx-auto h-20 w-20">
									{user.avatar ? (
										<AvatarImage src={user.avatar} alt={user.name} />
									) : null}
									<AvatarFallback className="bg-muted text-lg font-medium text-muted-foreground">
										{user.name
											.split(" ")
											.map((n) => n[0])
											.join("")
											.toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<div className="space-y-2">
									<h2 className="text-xl font-semibold">{user.name}</h2>
									<p className="text-sm text-muted-foreground">{user.email}</p>
									<div className="flex justify-center gap-2">
										<Badge
											variant="secondary"
											className={getRoleColor(user.role)}
										>
											{user.role}
										</Badge>
										<Badge
											variant="secondary"
											className={getStatusColor(user.status)}
										>
											{user.status}
										</Badge>
									</div>
								</div>
							</div>

							{/* Status Alert */}
							<Alert
								className={
									user.status === "suspended"
										? "border-destructive"
										: user.status === "active"
											? "border-green-500"
											: "border-orange-500"
								}
							>
								{user.status === "suspended" ? (
									<AlertCircle className="h-4 w-4 text-destructive" />
								) : user.status === "active" ? (
									<CheckCircle className="h-4 w-4 text-green-600" />
								) : (
									<Clock className="h-4 w-4 text-orange-600" />
								)}
								<AlertDescription>
									{user.status === "suspended"
										? "This user account has been suspended and cannot access the platform."
										: user.status === "active"
											? "This user account is active and has full access to the platform."
											: "This user account is pending approval and has limited access."}
								</AlertDescription>
							</Alert>

							{/* Personal Information Card */}
							<Card>
								<CardHeader className="pb-3">
									<CardTitle className="flex items-center gap-2 text-base">
										<User className="h-4 w-4" />
										Personal Information
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="flex items-center gap-3">
										<Mail className="h-4 w-4 text-muted-foreground" />
										<div className="flex-1">
											<p className="text-sm font-medium">Email</p>
											<p className="text-sm text-muted-foreground">
												{user.email}
											</p>
										</div>
									</div>
									{user.organization && (
										<div className="flex items-center gap-3">
											<MapPin className="h-4 w-4 text-muted-foreground" />
											<div className="flex-1">
												<p className="text-sm font-medium">Organization</p>
												<p className="text-sm text-muted-foreground">
													{user.organization}
												</p>
											</div>
										</div>
									)}
								</CardContent>
							</Card>

							{/* Account Details Card */}
							<Card>
								<CardHeader className="pb-3">
									<CardTitle className="flex items-center gap-2 text-base">
										<Shield className="h-4 w-4" />
										Account Details
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="flex items-center gap-3">
										<Calendar className="h-4 w-4 text-muted-foreground" />
										<div className="flex-1">
											<p className="text-sm font-medium">Joined</p>
											<p className="text-sm text-muted-foreground">
												{formatDate(user.joinDate)}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-3">
										<Clock className="h-4 w-4 text-muted-foreground" />
										<div className="flex-1">
											<p className="text-sm font-medium">Last Active</p>
											<p className="text-sm text-muted-foreground">
												{formatDate(user.lastActive)}
											</p>
										</div>
									</div>
								</CardContent>
							</Card>

							{/* Activity Card */}
							<Card>
								<CardHeader className="pb-3">
									<CardTitle className="flex items-center gap-2 text-base">
										<Activity className="h-4 w-4" />
										Activity Summary
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="grid grid-cols-2 gap-4">
										<div className="rounded-lg bg-muted p-3 text-center">
											<div className="text-2xl font-bold">
												{user.documentsCount}
											</div>
											<div className="text-xs text-muted-foreground">
												Documents
											</div>
										</div>
										<div className="rounded-lg bg-muted p-3 text-center">
											<div className="text-2xl font-bold">-</div>
											<div className="text-xs text-muted-foreground">
												Signatures
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						</>
					) : (
						<div className="py-8 text-center">
							<p className="text-muted-foreground">User not found</p>
						</div>
					)}
				</div>
			</SheetContent>
		</Sheet>
	)
}
