"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { CheckCircle2, Download, ExternalLink } from "lucide-react"
import { useSession } from "next-auth/react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Checkbox } from "@/core/components/ui/checkbox"
import { Label } from "@/core/components/ui/label"
import { cn } from "@/core/lib/utils"

import { trpc } from "@/services/trpc/client"

import {
	ENP_COURSE_CERT_CHANGED_EVENT,
	getEnpCourseCertStorageKeys,
	mergeEnpCourseCertificateDownloadedAt,
	readEnpCourseCertificateDownloadedAt,
	writeEnpCourseCertificateDownloaded,
} from "../lib/enp-course-certificate"

function downloadCertificateHtml({
	fullName,
	email,
	downloadedAt,
}: {
	fullName: string
	email: string
	downloadedAt: Date
}) {
	const dateString = downloadedAt.toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "2-digit",
	})

	const safeName = (fullName || "Participant").replace(/[^\w\s-]/g, "").trim() || "Participant"
	const filename = `ENP-Course-Certificate-${safeName.replace(/\s+/g, "-")}.html`

	const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ENP Course Certificate</title>
    <style>
      :root { color-scheme: light; }
      body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; background: #0b1220; color: #0f172a; }
      .wrap { min-height: 100vh; display: grid; place-items: center; padding: 32px; }
      .cert {
        width: min(980px, 100%);
        background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
        border-radius: 18px;
        border: 1px solid rgba(15, 23, 42, 0.08);
        box-shadow: 0 18px 45px rgba(2, 6, 23, 0.35);
        padding: 44px 40px;
        position: relative;
        overflow: hidden;
      }
      .cert:before {
        content: "";
        position: absolute;
        inset: -120px -160px auto auto;
        width: 420px;
        height: 420px;
        background: radial-gradient(circle at 30% 30%, rgba(100,116,139,0.35), rgba(100,116,139,0) 55%);
        transform: rotate(20deg);
      }
      .kicker { letter-spacing: 0.18em; text-transform: uppercase; font-size: 12px; color: rgba(51, 65, 85, 0.75); }
      h1 { margin: 10px 0 0; font-size: 34px; line-height: 1.15; }
      .sub { margin-top: 12px; color: rgba(51, 65, 85, 0.85); font-size: 14px; }
      .name { margin: 24px 0 6px; font-size: 28px; font-weight: 650; }
      .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 18px; margin-top: 26px; padding-top: 20px; border-top: 1px solid rgba(15, 23, 42, 0.08); }
      .meta div { font-size: 13px; color: rgba(51, 65, 85, 0.9); }
      .label { display:block; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(51, 65, 85, 0.65); margin-bottom: 6px; }
      .footer { margin-top: 26px; font-size: 12px; color: rgba(51, 65, 85, 0.65); }
      .badge { display:inline-flex; align-items:center; gap:8px; border: 1px solid rgba(15, 23, 42, 0.08); border-radius: 999px; padding: 8px 12px; background: rgba(241, 245, 249, 0.75); }
      .dot { width: 8px; height: 8px; border-radius: 999px; background: rgba(71, 85, 105, 0.85); }
    </style>
  </head>
  <body>
    <div class="wrap">
      <main class="cert" role="document" aria-label="ENP course completion certificate">
        <div class="kicker">Certificate of Completion</div>
        <h1>ENP Course</h1>
        <p class="sub">This document confirms course completion for placeholder LMS integration.</p>

        <div class="name">${escapeHtml(fullName || "Participant")}</div>
        <div class="badge"><span class="dot"></span><span>Completed on ${escapeHtml(dateString)}</span></div>

        <section class="meta" aria-label="Certificate metadata">
          <div>
            <span class="label">Participant email</span>
            <span>${escapeHtml(email || "—")}</span>
          </div>
          <div>
            <span class="label">Certificate ID</span>
            <span>${escapeHtml(makeCertificateId(downloadedAt))}</span>
          </div>
        </section>

        <div class="footer">Quanby Sign — placeholder certificate (until LMS integration is live).</div>
      </main>
    </div>
  </body>
</html>`

	const blob = new Blob([html], { type: "text/html;charset=utf-8" })
	const url = URL.createObjectURL(blob)

	const a = document.createElement("a")
	a.href = url
	a.download = filename
	document.body.appendChild(a)
	a.click()
	a.remove()

	setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function escapeHtml(input: string) {
	return input
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;")
}

function makeCertificateId(date: Date) {
	const ts = date
		.toISOString()
		.replaceAll(/[-:TZ.]/g, "")
		.slice(0, 14)
	const rand = Math.random().toString(16).slice(2, 10).toUpperCase()
	return `ENP-${ts}-${rand}`
}

const ENP_LMS_MODULE_LABELS = [
	"Module 1 — eNotarization rules and platform safety",
	"Module 2 — Identity verification and signer obligations",
	"Module 3 — Document handling, seals, and audit trail",
	"Module 4 — Remote notarization (REN) workflow",
	"Module 5 — Ethics, privilege, and session closure",
] as const

export function EnpCoursePlaceholder() {
	const { data: session, status: sessionStatus, update } = useSession()
	const userId = session?.user?.id
	const userEmail = session?.user?.email
	const isAuth = Boolean(userId)
	const utils = trpc.useUtils()
	const { data: lmsCompletion, isFetched: lmsFetched } =
		trpc.legalRegistration.getMyEnpLmsCompletion.useQuery(undefined, {
			enabled: isAuth,
			refetchOnWindowFocus: true,
		})
	const recordLmsCompletion = trpc.legalRegistration.recordEnpLmsCourseCompletion.useMutation({
		onSuccess: async result => {
			void utils.legalRegistration.getMyEnpLmsCompletion.invalidate()
			if (result.promotedToEnp) {
				await update()
			}
		},
	})
	const recordAllModules = trpc.legalRegistration.recordEnpLmsAllModulesCompletion.useMutation({
		onSuccess: () => {
			void utils.legalRegistration.getMyEnpLmsCompletion.invalidate()
		},
	})
	const lmsBackfillDoneRef = useRef(false)

	const [modulesAck, setModulesAck] = useState<boolean[]>(() =>
		ENP_LMS_MODULE_LABELS.map(() => false)
	)

	const fullName = useMemo(() => {
		const name = session?.user?.name?.trim()
		if (name) return name
		return "Participant"
	}, [session?.user?.name])
	const email = session?.user?.email ?? ""

	const [hasMarkedComplete, setHasMarkedComplete] = useState(false)
	const [localDownloadedAtIso, setLocalDownloadedAtIso] = useState<string | null>(null)

	useEffect(() => {
		setLocalDownloadedAtIso(readEnpCourseCertificateDownloadedAt(userId, userEmail))
	}, [userId, userEmail])

	useEffect(() => {
		if (sessionStatus !== "authenticated" || !lmsFetched || lmsBackfillDoneRef.current) return
		const local = readEnpCourseCertificateDownloadedAt(userId, userEmail)
		if (!local || lmsCompletion?.completedAt) return
		lmsBackfillDoneRef.current = true
		void recordLmsCompletion.mutate(
			{ completedAtIso: local },
			{
				onError: () => {
					lmsBackfillDoneRef.current = false
				},
			}
		)
		// eslint-disable-next-line react-hooks/exhaustive-deps -- recordLmsCompletion identity
	}, [lmsCompletion?.completedAt, lmsFetched, sessionStatus, userEmail, userId])

	useEffect(() => {
		if (localDownloadedAtIso) setHasMarkedComplete(true)
	}, [localDownloadedAtIso])

	useEffect(() => {
		const keys = new Set(getEnpCourseCertStorageKeys(userId, userEmail))
		if (keys.size === 0) return
		const handler = (event: StorageEvent) => {
			if (!event.key || !keys.has(event.key)) return
			setLocalDownloadedAtIso(readEnpCourseCertificateDownloadedAt(userId, userEmail))
		}
		window.addEventListener("storage", handler)
		return () => window.removeEventListener("storage", handler)
	}, [userId, userEmail])

	useEffect(() => {
		const sync = () =>
			setLocalDownloadedAtIso(readEnpCourseCertificateDownloadedAt(userId, userEmail))
		window.addEventListener("focus", sync)
		window.addEventListener("pageshow", sync)
		window.addEventListener(ENP_COURSE_CERT_CHANGED_EVENT, sync)
		return () => {
			window.removeEventListener("focus", sync)
			window.removeEventListener("pageshow", sync)
			window.removeEventListener(ENP_COURSE_CERT_CHANGED_EVENT, sync)
		}
	}, [userId, userEmail])

	const effectiveDownloadedAtIso = useMemo(
		() =>
			mergeEnpCourseCertificateDownloadedAt(
				lmsCompletion?.completedAt ?? null,
				localDownloadedAtIso
			),
		[lmsCompletion?.completedAt, localDownloadedAtIso]
	)

	const isCertificateDownloaded = Boolean(effectiveDownloadedAtIso)
	const step2CompleteServer = Boolean(lmsCompletion?.completedAt)
	const allModulesDoneServer = Boolean(lmsCompletion?.allModulesCompletedAt)
	const showFullProgram = isCertificateDownloaded || step2CompleteServer
	const allModulesAcked = modulesAck.every(Boolean)
	const downloadedAtLabel = effectiveDownloadedAtIso
		? new Date(effectiveDownloadedAtIso).toLocaleString()
		: null
	const canPersistCertificate = getEnpCourseCertStorageKeys(userId, userEmail).length > 0
	const isAuthenticated = canPersistCertificate

	return (
		<Card>
			<CardHeader>
				<CardTitle>ENP Course (Placeholder)</CardTitle>
				<CardDescription>
					Step 2 (certificate) upgrades your account to ENP when you started as a principal. The
					five-module checklist below is optional progress only. Sessions, browse, and booking
					unlock when an administrator sets your commission to Active (accreditation step 5)—not
					when you tick all five boxes here.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{isCertificateDownloaded ? (
					<Alert
						className="text-foreground border-emerald-500/35 bg-emerald-500/10 dark:border-emerald-400/30 dark:bg-emerald-400/10"
						role="status"
					>
						<CheckCircle2 className="text-emerald-600 dark:text-emerald-400" />
						<AlertTitle>Course completed</AlertTitle>
						<AlertDescription className="text-muted-foreground mt-1">
							You&apos;ve finished step 2 and downloaded your certificate
							{downloadedAtLabel ? ` on ${downloadedAtLabel}` : ""}. Your role is now ENP if you
							began as a principal. You can use the module checklist below to track training;
							hosting sessions and appearing in browse still require commission Active from an
							administrator.
						</AlertDescription>
					</Alert>
				) : null}

				<div className="space-y-2">
					<div className="text-sm font-medium">
						1) Complete course
						{isCertificateDownloaded ? (
							<span className="text-muted-foreground ml-2 font-normal">(done)</span>
						) : null}
					</div>
					<div className="text-muted-foreground text-sm">
						{isCertificateDownloaded
							? "No action needed — you’ve already completed this placeholder step."
							: "When LMS is integrated, this button will open the course."}
					</div>
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="secondary"
							disabled={isCertificateDownloaded}
							onClick={() => setHasMarkedComplete(true)}
						>
							Complete course
							<ExternalLink className="size-4" />
						</Button>
						<Button asChild type="button" variant="link">
							<Link href="/auth/legal-registration">Back to application</Link>
						</Button>
					</div>
				</div>

				<div className="border-border/60 bg-muted/30 space-y-2 rounded-lg border p-3">
					<div className="text-sm font-medium">
						2) Download certificate
						{isCertificateDownloaded ? (
							<span className="text-muted-foreground ml-2 font-normal">(already issued)</span>
						) : null}
					</div>
					<div className="text-muted-foreground text-sm">
						{isCertificateDownloaded
							? "Download again anytime — the completion date on the file will update."
							: "Download a default certificate. This is what flips the step to completed."}
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Button
							type="button"
							disabled={
								!isAuthenticated ||
								recordLmsCompletion.isPending ||
								(!hasMarkedComplete && !isCertificateDownloaded)
							}
							onClick={() => {
								if (!canPersistCertificate) return
								const now = new Date()
								downloadCertificateHtml({ fullName, email, downloadedAt: now })
								const iso = now.toISOString()
								writeEnpCourseCertificateDownloaded(userId, userEmail, iso)
								setLocalDownloadedAtIso(iso)
								void recordLmsCompletion.mutateAsync({ completedAtIso: iso })
							}}
						>
							Download certificate
							<Download className="size-4" />
						</Button>
						{isCertificateDownloaded ? (
							<div className="text-muted-foreground text-xs">
								Certificate downloaded{downloadedAtLabel ? `: ${downloadedAtLabel}` : ""}.
							</div>
						) : !isAuthenticated ? (
							<div className="text-muted-foreground text-xs">
								Please sign in to download your certificate.
							</div>
						) : (
							<div className="text-muted-foreground text-xs">
								Click “Complete course” first to enable download.
							</div>
						)}
					</div>
				</div>

				{showFullProgram ? (
					<div className="border-border/60 bg-muted/20 space-y-3 rounded-lg border p-4">
						<div className="text-sm font-medium">
							3) Full ENP program (5 of 5 modules — optional record)
						</div>
						{allModulesDoneServer ? (
							<Alert className="border-emerald-500/35 bg-emerald-500/10" role="status">
								<CheckCircle2 className="text-emerald-600 dark:text-emerald-400" />
								<AlertTitle>All modules recorded</AlertTitle>
								<AlertDescription className="text-muted-foreground mt-1">
									Training progress is saved. Sessions and being listed for booking still require
									commission Active (admin approval after accreditation).
								</AlertDescription>
							</Alert>
						) : (
							<>
								<p className="text-muted-foreground text-sm">
									Confirm each module when finished (placeholder until the LMS tracks progress).
									This does not replace admin commission activation for live sessions or public
									booking.
								</p>
								<ul className="space-y-3">
									{ENP_LMS_MODULE_LABELS.map((label, idx) => (
										<li key={label} className="flex items-start gap-3">
											<Checkbox
												id={`enp-mod-${idx}`}
												checked={modulesAck[idx]}
												onCheckedChange={v => {
													setModulesAck(prev => {
														const next = [...prev]
														next[idx] = v === true
														return next
													})
												}}
												className="mt-0.5"
											/>
											<Label
												htmlFor={`enp-mod-${idx}`}
												className={cn(
													"cursor-pointer text-sm leading-snug font-normal",
													modulesAck[idx] && "text-muted-foreground"
												)}
											>
												{label}
											</Label>
										</li>
									))}
								</ul>
								<Button
									type="button"
									disabled={!allModulesAcked || recordAllModules.isPending}
									onClick={() => void recordAllModules.mutateAsync()}
								>
									{recordAllModules.isPending ? "Saving…" : "Record 5 of 5 completion"}
								</Button>
							</>
						)}
					</div>
				) : null}
			</CardContent>
		</Card>
	)
}
