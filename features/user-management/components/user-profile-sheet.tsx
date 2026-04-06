"use client"

import { useEffect, useState } from "react"
import { Activity, Calendar, CheckCircle, Clock, Mail, MapPin, Shield, User } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/core/components/ui/sheet"

import { trpc } from "@/services/trpc/client"

interface UserProfileSheetProps {
	userId: string
	trigger: React.ReactNode
}

export function UserProfileSheet({ userId, trigger }: UserProfileSheetProps) {
	const [open, setOpen] = useState(false)
	const { data: session } = useSession()
	const utils = trpc.useUtils()

	const isAdmin =
		// @ts-expect-error -- SUPER_ADMIN is a valid legacy role
		session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN"

	const { data: user, isLoading } = trpc.userManagement.getById.useQuery(
		{ id: userId },
		{ enabled: open }
	)

	const [subOrgName, setSubOrgName] = useState("")
	const [subOrgAddress, setSubOrgAddress] = useState("")
	const [subOrgTypeName, setSubOrgTypeName] = useState("Department")
	const [subOrgPhoto, setSubOrgPhoto] = useState<File | null>(null)
	const [provisionViaApiPending, setProvisionViaApiPending] = useState(false)
	const [creditsToTransferOnly, setCreditsToTransferOnly] = useState<string>("")

	useEffect(() => {
		if (!open || !user) return
		if (user.role.toUpperCase() !== "ENP") return

		setSubOrgName(user.enpProfile?.doconchainSubOrgName ?? user.name)
		setSubOrgAddress(
			user.enpProfile?.doconchainSubOrgAddress ?? user.enpProfile?.notaryAddress ?? ""
		)
		setSubOrgTypeName("Department")
		setSubOrgPhoto(null)
		setCreditsToTransferOnly("")
	}, [open, user])

	const provisionSubOrgMutation =
		trpc.userManagement.provisionEnpDoconchainSubOrganization.useMutation({
			onSuccess: async data => {
				toast.success(
					data.created
						? `Created DocOnChain sub-org (${data.subOrgId}).`
						: `ENP already has a DocOnChain sub-org (${data.subOrgId}).`
				)
				await utils.userManagement.getById.invalidate({ id: userId })
			},
			onError: err => toast.error(err.message || "Failed to provision ENP sub-organization."),
		})

	const transferCreditsMutation =
		trpc.userManagement.transferCreditsToEnpSubOrganization.useMutation({
			onSuccess: async data => {
				toast.success(`Transferred ${data.transferredCredits} credits.`)
				await utils.userManagement.getById.invalidate({ id: userId })
			},
			onError: err => toast.error(err.message || "Failed to transfer credits."),
		})

	const clearSubOrgMutation = trpc.userManagement.clearEnpDoconchainSubOrg.useMutation({
		onSuccess: async () => {
			toast.success("Sub-org cleared from profile. You can create a new one.")
			await utils.userManagement.getById.invalidate({ id: userId })
		},
		onError: err => toast.error(err.message || "Failed to clear sub-org."),
	})

	const provisionWithOptionalPhoto = async () => {
		if (!subOrgName.trim() || !subOrgAddress.trim()) return

		// If we have a photo, use the multipart route (tRPC can't send files).
		if (subOrgPhoto) {
			setProvisionViaApiPending(true)
			try {
				const form = new FormData()
				form.set("enpId", userId)
				form.set("name", subOrgName)
				form.set("address", subOrgAddress)
				form.set("subOrganizationTypeName", subOrgTypeName.trim() || "Department")
				form.set("photo", subOrgPhoto, subOrgPhoto.name)

				const res = await fetch("/api/doconchain/organizations/sub", { method: "POST", body: form })
				const json = (await res.json().catch(() => null)) as null | {
					error?: string
					subOrgId?: string
				}
				if (!res.ok) {
					throw new Error(json?.error ?? `Failed to create sub-org (${res.status}).`)
				}
				toast.success(`Created DocOnChain sub-org (${json?.subOrgId ?? "ok"}).`)
				await utils.userManagement.getById.invalidate({ id: userId })
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Failed to provision ENP sub-organization."
				)
			} finally {
				setProvisionViaApiPending(false)
			}
			return
		}

		provisionSubOrgMutation.mutate({
			enpId: userId,
			name: subOrgName,
			address: subOrgAddress,
			subOrganizationTypeName: subOrgTypeName.trim() || "Department",
		})
	}

	const getRoleColor = (role: string) => {
		switch (role.toUpperCase()) {
			case "PRINCIPAL":
				return "bg-blue-100 text-blue-800"
			case "ENP":
				return "bg-green-100 text-green-800"
			case "ENA":
				return "bg-yellow-100 text-yellow-800"
			case "ADMIN":
				return "bg-purple-100 text-purple-800"
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
			minute: "2-digit",
		})
	}

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>{trigger}</SheetTrigger>
			<SheetContent className="bg-background w-100 overflow-y-auto border-l sm:w-135">
				<SheetHeader className="sr-only">
					<SheetTitle>User Profile</SheetTitle>
				</SheetHeader>

				<div className="space-y-4 p-4">
					{isLoading ? (
						<div className="space-y-4">
							<div className="bg-muted mx-auto h-20 w-20 animate-pulse rounded-full" />
							<div className="space-y-2">
								<div className="bg-muted mx-auto h-4 w-32 animate-pulse rounded" />
								<div className="bg-muted mx-auto h-3 w-48 animate-pulse rounded" />
							</div>
						</div>
					) : user ? (
						<>
							{/* Profile Header */}
							<div className="space-y-3 text-center">
								<Avatar className="mx-auto h-20 w-20">
									{user.avatar ? <AvatarImage src={user.avatar} alt={user.name} /> : null}
									<AvatarFallback className="bg-muted text-muted-foreground text-lg font-medium">
										{user.name
											.split(" ")
											.map(n => n[0])
											.join("")
											.toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<div className="space-y-2">
									<h2 className="text-xl font-semibold">{user.name}</h2>
									<p className="text-muted-foreground text-sm">{user.email}</p>
									<div className="flex justify-center gap-2">
										<Badge variant="secondary" className={getRoleColor(user.role)}>
											{user.role}
										</Badge>
										<Badge variant="secondary" className={getStatusColor(user.status)}>
											{user.status}
										</Badge>
									</div>
								</div>
							</div>

							{/* Status Alert */}
							<Alert
								className={user.status === "active" ? "border-green-500" : "border-orange-500"}
							>
								{user.status === "active" ? (
									<CheckCircle className="h-4 w-4 text-green-600" />
								) : (
									<Clock className="h-4 w-4 text-orange-600" />
								)}
								<AlertDescription>
									{user.status === "active"
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
										<Mail className="text-muted-foreground h-4 w-4" />
										<div className="flex-1">
											<p className="text-sm font-medium">Email</p>
											<p className="text-muted-foreground text-sm">{user.email}</p>
										</div>
									</div>
									{user.organization && (
										<div className="flex items-center gap-3">
											<MapPin className="text-muted-foreground h-4 w-4" />
											<div className="flex-1">
												<p className="text-sm font-medium">Organization</p>
												<p className="text-muted-foreground text-sm">{user.organization}</p>
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
										<Calendar className="text-muted-foreground h-4 w-4" />
										<div className="flex-1">
											<p className="text-sm font-medium">Joined</p>
											<p className="text-muted-foreground text-sm">{formatDate(user.joinDate)}</p>
										</div>
									</div>
									<div className="flex items-center gap-3">
										<Clock className="text-muted-foreground h-4 w-4" />
										<div className="flex-1">
											<p className="text-sm font-medium">Last Active</p>
											<p className="text-muted-foreground text-sm">{formatDate(user.lastActive)}</p>
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
										<div className="bg-muted rounded-lg p-3 text-center">
											<div className="text-2xl font-bold">{user.documentsCount}</div>
											<div className="text-muted-foreground text-xs">Documents</div>
										</div>
										<div className="bg-muted rounded-lg p-3 text-center">
											<div className="text-2xl font-bold">-</div>
											<div className="text-muted-foreground text-xs">Signatures</div>
										</div>
									</div>
								</CardContent>
							</Card>

							{user.role.toUpperCase() === "ENP" && isAdmin ? (
								<Card>
									<CardHeader className="pb-3">
										<CardTitle className="text-base">DocOnChain Sub-Organization</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										{user.enpProfile?.doconchainSubOrgId ? (
											<>
												<div className="space-y-1">
													<p className="text-sm font-medium">Sub-org ID</p>
													<p className="text-muted-foreground text-sm break-all">
														{user.enpProfile.doconchainSubOrgId}
													</p>
												</div>
												<div className="grid gap-2">
													<Label htmlFor="transfer-credits">Transfer credits to sub-org</Label>
													<div className="flex gap-2">
														<Input
															id="transfer-credits"
															inputMode="numeric"
															placeholder="e.g. 20"
															value={creditsToTransferOnly}
															onChange={e => setCreditsToTransferOnly(e.target.value)}
														/>
														<Button
															type="button"
															disabled={
																transferCreditsMutation.isPending || !creditsToTransferOnly.trim()
															}
															onClick={() =>
																transferCreditsMutation.mutate({
																	enpId: userId,
																	credits: Number(creditsToTransferOnly),
																})
															}
														>
															Transfer
														</Button>
													</div>
												</div>
												<div className="border-t pt-3">
													<Button
														type="button"
														variant="outline"
														size="sm"
														disabled={clearSubOrgMutation.isPending}
														onClick={() => clearSubOrgMutation.mutate({ enpId: userId })}
													>
														{clearSubOrgMutation.isPending
															? "Clearing..."
															: "Clear sub-org (e.g. deleted in DocOnChain)"}
													</Button>
												</div>
											</>
										) : (
											<div className="grid gap-3">
												<div className="grid gap-2">
													<Label htmlFor="sub-org-name">Sub-org name</Label>
													<Input
														id="sub-org-name"
														placeholder="e.g. Notary Office Alpha"
														value={subOrgName}
														onChange={e => setSubOrgName(e.target.value)}
													/>
												</div>
												<div className="grid gap-2">
													<Label htmlFor="sub-org-address">Address / contact</Label>
													<Input
														id="sub-org-address"
														placeholder="e.g. 123 Main St, City"
														value={subOrgAddress}
														onChange={e => setSubOrgAddress(e.target.value)}
													/>
												</div>
												<div className="grid gap-2">
													<Label htmlFor="sub-org-type">Sub-org type</Label>
													<Input
														id="sub-org-type"
														placeholder="e.g. Department"
														value={subOrgTypeName}
														onChange={e => setSubOrgTypeName(e.target.value)}
													/>
												</div>
												<div className="grid gap-2">
													<Label htmlFor="sub-org-photo">Branding image (optional)</Label>
													<Input
														id="sub-org-photo"
														type="file"
														accept="image/*"
														onChange={e => setSubOrgPhoto(e.target.files?.[0] ?? null)}
													/>
												</div>
												<Button
													type="button"
													disabled={
														provisionSubOrgMutation.isPending ||
														provisionViaApiPending ||
														!subOrgName.trim() ||
														!subOrgAddress.trim()
													}
													onClick={() => void provisionWithOptionalPhoto()}
												>
													Create sub-org
												</Button>
											</div>
										)}
									</CardContent>
								</Card>
							) : null}
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
