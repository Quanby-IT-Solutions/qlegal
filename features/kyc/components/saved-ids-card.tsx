"use client"

import { useEffect, useState } from "react"
import { CreditCard, ShieldCheck } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import { Skeleton } from "@/core/components/ui/skeleton"

import { getUserKycInfoWithSavedIds } from "@/features/kyc/api/kyc.actions"

type SavedIdItem = {
	id: string
	documentType: string
	documentNumber: string | null
	documentCountry: string | null
	firstName: string | null
	lastName: string | null
	faceImageUrl: string | null
	verifiedAt: Date | null
	expiresAt: Date | null
	isExpired: boolean | null
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
	NATIONAL_ID: "National ID",
	DRIVERS_LICENSE: "Driver's License",
	PASSPORT: "Passport",
	VOTERS_ID: "Voter's ID",
	UMID: "UMID",
	SSS_ID: "SSS ID",
	PHILHEALTH_ID: "PhilHealth ID",
	TIN_ID: "TIN ID",
	POSTAL_ID: "Postal ID",
	PRC_ID: "PRC ID",
	OTHER: "Other ID",
}

function formatDocumentType(type: string): string {
	return DOCUMENT_TYPE_LABELS[type] ?? type
}

function maskDocumentNumber(number: string | null): string {
	if (!number) return "----"
	if (number.length <= 4) return number
	return `****${number.slice(-4)}`
}

function formatDate(date: Date | null): string {
	if (!date) return "N/A"
	return new Date(date).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	})
}

function isExpiredNow(expiresAt: Date | null, isExpired: boolean | null): boolean {
	if (isExpired) return true
	if (!expiresAt) return false
	return new Date(expiresAt) < new Date()
}

function SavedIdRow({ savedId, isDefault }: { savedId: SavedIdItem; isDefault: boolean }) {
	const expired = isExpiredNow(savedId.expiresAt, savedId.isExpired)
	const initials = [savedId.firstName?.[0], savedId.lastName?.[0]].filter(Boolean).join("") || "ID"

	return (
		<div className="flex items-center gap-4">
			<Avatar className="size-10 rounded-md">
				{savedId.faceImageUrl ? (
					<AvatarImage src={savedId.faceImageUrl} alt="ID photo" className="object-cover" />
				) : null}
				<AvatarFallback className="rounded-md text-xs">{initials}</AvatarFallback>
			</Avatar>

			<div className="flex-1 space-y-0.5">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium">{formatDocumentType(savedId.documentType)}</span>
					{savedId.documentCountry && (
						<span className="text-muted-foreground text-xs">({savedId.documentCountry})</span>
					)}
					{isDefault && (
						<Badge
							variant="outline"
							className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
						>
							Default
						</Badge>
					)}
				</div>
				<div className="text-muted-foreground flex items-center gap-3 text-xs">
					<span>No. {maskDocumentNumber(savedId.documentNumber)}</span>
					<span>Verified {formatDate(savedId.verifiedAt)}</span>
				</div>
			</div>

			<Badge
				variant="outline"
				className={
					expired
						? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
						: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
				}
			>
				{expired ? "Expired" : "Valid"}
			</Badge>
		</div>
	)
}

export function SavedIdsCard() {
	const [savedIds, setSavedIds] = useState<SavedIdItem[]>([])
	const [defaultId, setDefaultId] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		async function fetchSavedIds() {
			try {
				const result = await getUserKycInfoWithSavedIds()
				if (result.success && "data" in result && result.data) {
					const data = result.data as {
						savedIds: SavedIdItem[]
						defaultSavedId: { id: string } | null
					}
					setSavedIds(data.savedIds)
					setDefaultId(data.defaultSavedId?.id ?? null)
				}
			} catch {
				// Silently fail — card will show empty state
			} finally {
				setIsLoading(false)
			}
		}
		void fetchSavedIds()
	}, [])

	return (
		<Card className="border-border/60 bg-card/80 dark:bg-card/70 border shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md">
			<CardHeader className="px-8 pt-4">
				<CardTitle className="flex items-center gap-2 text-lg font-medium">
					<ShieldCheck className="size-5" />
					Verified IDs
				</CardTitle>
				<CardDescription>
					Your KYC-verified identity documents. A valid ID is required for booking notarization
					sessions.
				</CardDescription>
			</CardHeader>

			<CardContent className="px-8">
				{isLoading ? (
					<div className="space-y-4">
						{[1, 2].map(i => (
							<div key={i} className="flex items-center gap-4">
								<Skeleton className="size-10 rounded-md" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-3 w-48" />
								</div>
								<Skeleton className="h-5 w-14 rounded-full" />
							</div>
						))}
					</div>
				) : savedIds.length === 0 ? (
					<div className="flex flex-col items-center gap-2 py-6 text-center">
						<CreditCard className="text-muted-foreground size-8" />
						<p className="text-muted-foreground text-sm">
							No verified IDs yet. Complete KYC verification to add your first ID.
						</p>
					</div>
				) : (
					<div className="space-y-0">
						{savedIds.map((savedId, index) => (
							<div key={savedId.id}>
								{index > 0 && <Separator className="my-3" />}
								<SavedIdRow savedId={savedId} isDefault={savedId.id === defaultId} />
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
