"use client"

import { type Route } from "next"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight01Icon, Clock01Icon, File01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { format } from "date-fns"

import { Badge } from "@/core/components/ui/badge"
import { buttonVariants } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"

import { type RouterOutputs } from "@/services/trpc/client"

import { getStatusVariant } from "../lib/dashboard-utils"

interface DashboardRecentDocumentsProps {
	documents: RouterOutputs["dashboard"]["getRecentDocuments"] | undefined
	isLoading: boolean
}

export function DashboardRecentDocuments({ documents, isLoading }: DashboardRecentDocumentsProps) {
	const router = useRouter()

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Recent Documents</CardTitle>
						<CardDescription>Your latest uploaded files</CardDescription>
					</div>
					<Link href="/envelopes" className={buttonVariants({ variant: "ghost", size: "sm" })}>
						View All
						<HugeiconsIcon icon={ArrowRight01Icon} size={16} className="ml-2" />
					</Link>
				</div>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="flex items-start gap-4">
								<Skeleton className="h-10 w-10 rounded" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-3 w-full" />
								</div>
							</div>
						))}
					</div>
				) : documents && documents.length > 0 ? (
					<div className="space-y-4">
						{documents.map(document => (
							<div
								key={document.id}
								className="hover:bg-muted/50 flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors"
								onClick={() => router.push(`/envelopes/${document.envelopeId}` as Route)}
							>
								<div className="flex h-10 w-10 items-center justify-center rounded bg-blue-50">
									<HugeiconsIcon icon={File01Icon} size={20} className="text-blue-600" />
								</div>
								<div className="flex-1 space-y-1">
									<div className="flex items-center justify-between">
										<p className="font-medium">{document.name}</p>
										<Badge variant={getStatusVariant(document.status)}>{document.status}</Badge>
									</div>
									<p className="text-muted-foreground text-sm">{document.envelopeTitle}</p>
									<div className="text-muted-foreground flex items-center gap-2 text-xs">
										<HugeiconsIcon icon={Clock01Icon} size={12} />
										{format(new Date(document.createdAt), "PPp")}
									</div>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<HugeiconsIcon icon={File01Icon} size={48} className="text-muted-foreground/50" />
						<p className="text-muted-foreground mt-4 text-sm">No documents yet</p>
						<Link
							href="/envelopes"
							className={buttonVariants({
								variant: "outline",
								size: "sm",
								className: "mt-4",
							})}
						>
							Upload Document
						</Link>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
