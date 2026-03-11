"use client"

import { Loader2, Monitor, Smartphone, XCircle } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { CardContent, CardFooter } from "@/core/components/ui/card"
import { FieldGroup } from "@/core/components/ui/field"

interface KycMobileFlowProps {
	onBack: () => void
	onNext: () => void
	onCreateMobileLink: () => void
	onResumeMobileLink: () => void
	onSelectDesktop: () => void
	isMobilePending: boolean
	showPendingBanner: boolean
	showCancelledBanner?: boolean
	hasHostedLink?: boolean
	hasExpiredLink: boolean
}

export function KycMobileFlow({
	onBack,
	onNext,
	onCreateMobileLink,
	onResumeMobileLink,
	onSelectDesktop,
	isMobilePending,
	showPendingBanner,
	showCancelledBanner,
	hasHostedLink,
	hasExpiredLink,
}: KycMobileFlowProps) {
	return (
		<>
			<CardContent className="px-2!">
				<FieldGroup className="bg-background/70 gap-4 rounded-md border p-4 sm:gap-5">
					<p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-wider uppercase">
						Verification method
					</p>

					<div className="grid gap-3">
						{showCancelledBanner ? (
							<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/70 dark:bg-amber-950/25">
								<div className="flex items-start gap-3">
									<XCircle className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" />
									<div className="flex-1">
										<p className="mb-1 text-sm font-medium text-amber-900 dark:text-amber-100">
											Verification cancelled
										</p>
										<p className="text-sm text-amber-800/90 dark:text-amber-200/90">
											You closed the verification window. You can try again anytime.
										</p>
									</div>
								</div>
							</div>
						) : null}

						<Button
							onClick={hasHostedLink ? onResumeMobileLink : onCreateMobileLink}
							disabled={isMobilePending}
							variant="outline"
							className="h-auto w-full cursor-pointer items-start justify-start gap-3 px-4 py-3 text-left whitespace-normal"
							size="lg"
							type="button"
						>
							<div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md sm:size-10">
								{isMobilePending ? (
									<Loader2 className="size-5 animate-spin" />
								) : (
									<Smartphone className="size-5" />
								)}
							</div>
							<div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
								<span className="text-sm leading-snug font-medium">
									{hasHostedLink ? "Resume mobile verification" : "Mobile Link Verification"}
								</span>
								<span className="text-muted-foreground text-xs leading-snug wrap-break-word">
									{hasHostedLink
										? "Reopen your verification link on your phone and continue where you left off."
										: "Open a secure link on your phone to complete verification."}
								</span>
							</div>
						</Button>

						<Button
							onClick={onSelectDesktop}
							disabled={isMobilePending}
							variant="outline"
							className="h-auto w-full cursor-pointer items-start justify-start gap-3 px-4 py-3 text-left whitespace-normal"
							size="lg"
							type="button"
						>
							<div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md sm:size-10">
								<Monitor className="size-5" />
							</div>
							<div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
								<span className="text-sm leading-snug font-medium">
									{showPendingBanner ? "Switch to desktop camera" : "Desktop Camera Verification"}
								</span>
								<span className="text-muted-foreground text-xs leading-snug wrap-break-word">
									Use your desktop webcam to capture your ID and selfie
									{showPendingBanner ? " directly in this browser." : "."}
								</span>
							</div>
						</Button>

						{showPendingBanner && (
							<>
								<div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
									<div className="flex items-start gap-3">
										<Loader2 className="mt-0.5 size-5 shrink-0 animate-spin text-blue-600 dark:text-blue-400" />
										<div className="flex-1">
											<p className="mb-1 text-sm font-medium text-blue-900 dark:text-blue-100">
												Verification in progress
											</p>
											<p className="text-sm text-blue-700 dark:text-blue-300">
												Complete verification on your mobile device. This page will update
												automatically.
											</p>
										</div>
									</div>
								</div>
								<div className="flex justify-center border-t pt-3">
									<button
										onClick={onCreateMobileLink}
										disabled={isMobilePending}
										className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 transition-colors hover:underline disabled:pointer-events-none disabled:opacity-50"
										type="button"
									>
										{hasExpiredLink
											? "Link expired? Create new verification link"
											: "Link not working? Create new verification link"}
									</button>
								</div>
							</>
						)}
					</div>
				</FieldGroup>
			</CardContent>
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
