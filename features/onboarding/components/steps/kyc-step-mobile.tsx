"use client"

import { Loader2, ShieldCheck, XCircle } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/reui/alert"
import { Button } from "@/core/components/ui/button"
import { CardContent, CardFooter } from "@/core/components/ui/card"
import { FieldGroup } from "@/core/components/ui/field"

interface KycMobileFlowProps {
	onBack: () => void
	onNext: () => void
	onStartVerification: () => void
	isPending: boolean
	showPendingBanner: boolean
	showCancelledBanner?: boolean
}

export function KycMobileFlow({
	onBack,
	onNext,
	onStartVerification,
	isPending,
	showPendingBanner,
	showCancelledBanner,
}: KycMobileFlowProps) {
	return (
		<>
			<CardContent className="px-2!">
				<FieldGroup className="bg-background/70 gap-4 rounded-md border p-4 sm:gap-5">
					<p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-wider uppercase">
						Verification method
					</p>

					<div className="grid gap-3">
						<Button
							onClick={onStartVerification}
							disabled={isPending}
							variant="default"
							className="w-full"
							size="lg"
							type="button"
						>
							{isPending ? (
								<>
									<Loader2 className="mr-2 size-5 animate-spin" />
									Starting...
								</>
							) : (
								<>
									<ShieldCheck className="mr-2 size-5" />
									Start verification
								</>
							)}
						</Button>

						{showPendingBanner && (
							<div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
								<div className="flex items-start gap-3">
									<Loader2 className="mt-0.5 size-5 shrink-0 animate-spin text-blue-600 dark:text-blue-400" />
									<div className="flex-1">
										<p className="mb-1 text-sm font-medium text-blue-900 dark:text-blue-100">
											Verification in progress
										</p>
										<p className="text-sm text-blue-700 dark:text-blue-300">
											Complete verification in the window that opened. This page will update
											automatically.
										</p>
									</div>
								</div>
							</div>
						)}
					</div>
				</FieldGroup>
			</CardContent>

			{showCancelledBanner ? (
				<CardContent className="px-2!">
					<Alert variant="warning">
						<XCircle className="size-4" />
						<AlertTitle>Verification cancelled</AlertTitle>
						<AlertDescription>
							You closed the verification window. You can try again anytime.
						</AlertDescription>
					</Alert>
				</CardContent>
			) : null}

			<CardFooter className="flex items-center justify-end gap-2">
				<Button type="button" variant="ghost" size="sm" onClick={onBack}>
					Back
				</Button>
				<Button type="button" onClick={onNext} size="sm" disabled>
					Next
				</Button>
			</CardFooter>
		</>
	)
}
