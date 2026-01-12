// "use client"

// import { useRouter, useSearchParams } from "next/navigation"
// import { useEffect, useMemo, useState } from "react"
// import { CheckCircle, ClockIcon, FileText, Shield, XCircle } from "lucide-react"
// import { motion } from "motion/react"
// import { useSession } from "next-auth/react"

// import { Button } from "@/core/components/ui/button"
// import { cn } from "@/core/lib/utils"

// import { trpc } from "@/services/trpc/client"

// function ElegantShape({
// 	className,
// 	delay = 0,
// 	width = 400,
// 	height = 100,
// 	rotate = 0,
// 	gradient = "from-white/[0.08]",
// 	borderRadius = 16,
// }: {
// 	className?: string
// 	delay?: number
// 	width?: number
// 	height?: number
// 	rotate?: number
// 	gradient?: string
// 	borderRadius?: number
// }) {
// 	return (
// 		<motion.div
// 			initial={{
// 				opacity: 0,
// 				y: -150,
// 				rotate: rotate - 15,
// 			}}
// 			animate={{
// 				opacity: 1,
// 				y: 0,
// 				rotate,
// 			}}
// 			transition={{
// 				duration: 2.4,
// 				delay,
// 				ease: [0.23, 0.86, 0.39, 0.96],
// 				opacity: { duration: 1.2 },
// 			}}
// 			className={cn("absolute", className)}
// 		>
// 			<motion.div
// 				animate={{
// 					y: [0, 15, 0],
// 				}}
// 				transition={{
// 					duration: 12,
// 					repeat: Number.POSITIVE_INFINITY,
// 					ease: "easeInOut",
// 				}}
// 				style={{
// 					width,
// 					height,
// 				}}
// 				className="relative"
// 			>
// 				<div
// 					style={{ borderRadius }}
// 					className={cn(
// 						"absolute inset-0",
// 						"bg-gradient-to-r to-transparent",
// 						gradient,
// 						"backdrop-blur-[1px]",
// 						"ring-1 ring-white/[0.03] dark:ring-white/[0.02]",
// 						"shadow-[0_2px_16px_-2px_rgba(255,255,255,0.04)]",
// 						"after:absolute after:inset-0",
// 						"after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.12),transparent_70%)]",
// 						"after:rounded-[inherit]"
// 					)}
// 				/>
// 			</motion.div>
// 		</motion.div>
// 	)
// }

// export default function EnvelopeInvitePage() {
// 	const router = useRouter()
// 	const params = useSearchParams()
// 	const { status, data: session } = useSession()
// 	const [hasRequestedAccess, setHasRequestedAccess] = useState(false)

// 	const token = useMemo(() => params.get("token") ?? "", [params])
// 	const placeholder = useMemo(() => params.get("placeholder") ?? "", [params])
// 	const documentId = useMemo(() => params.get("documentId") ?? "", [params])

// 	// Debug: Log URL parameters
// 	console.log("🔍 Invite page - URL params:", {
// 		token,
// 		placeholder,
// 		documentId,
// 		allParams: Object.fromEntries(params.entries()),
// 	})

// 	// Don't automatically redirect to login - let user see the invite page first
// 	// They will be redirected to login when they try to request access

// 	// TODO: These procedures need to be implemented in envelopeLite router
// 	// Type assertion to suppress TypeScript errors until procedures are implemented

// 	// @ts-expect-error - getEnvelopeByToken doesn't exist yet, needs implementation
// 	const { data: envelopeData } = trpc.envelopeLite.getEnvelopeByToken.useQuery(
// 		{ token },
// 		{
// 			enabled: status === "authenticated" && token.length > 0,
// 		}
// 	)

// 	// Get documents for this envelope if we have envelope data
// 	const { data: envelopeDocuments } = trpc.envelopeLite.getEnvelopeDocuments.useQuery(
// 		{ envelopeId: envelopeData?.id ?? "" },
// 		{
// 			enabled: status === "authenticated" && token.length > 0 && !!envelopeData?.id,
// 		}
// 	)

// 	// Use the first document for the invite data
// 	const firstDocument = envelopeDocuments?.[0]

// 	// @ts-expect-error - getEnvelopeByToken doesn't exist yet, needs implementation
// 	const { data: invite, refetch } = trpc.envelopeLite.getEnvelopeByToken.useQuery(
// 		{ token },
// 		{
// 			enabled: status === "authenticated" && token.length > 0,
// 			// Poll every 5 seconds if the user has requested access but is still waiting
// 			refetchInterval: hasRequestedAccess ? 5000 : false,
// 			refetchIntervalInBackground: hasRequestedAccess,
// 		}
// 	)

// 	// Reset recipient status to allow proper flow
// 	// const resetRecipientStatus = trpc.envelopeLite.resetRecipientStatus.useMutation({
// 	//   onSuccess: async () => {
// 	//     await refetch()
// 	//   }
// 	// })

// 	// @ts-expect-error - acceptInviteByToken doesn't exist yet, needs implementation
// 	const accept = trpc.envelopeLite.acceptInviteByToken.useMutation({
// 		onSuccess: async () => {
// 			setHasRequestedAccess(true)
// 			// Refetch the invite data to get updated recipient status
// 			await refetch()
// 		},
// 		onError: (error: unknown) => {
// 			console.error("Accept mutation error:", error)
// 		},
// 	})

// 	// @ts-expect-error - acceptInviteByTokenWithPlaceholder doesn't exist yet, needs implementation
// 	const acceptWithPlaceholder = trpc.envelopeLite.acceptInviteByTokenWithPlaceholder.useMutation({
// 		onSuccess: async () => {
// 			setHasRequestedAccess(true)
// 			// Refetch the invite data to get updated recipient status
// 			await refetch()
// 		},
// 		onError: (error: unknown) => {
// 			console.error("AcceptWithPlaceholder mutation error:", error)
// 		},
// 	})

// 	// @ts-expect-error - declineInviteByToken doesn't exist yet, needs implementation
// 	const decline = trpc.envelopeLite.declineInviteByToken.useMutation({
// 		onSuccess: () => {
// 			router.push(`/envelopes`)
// 		},
// 	})

// 	// Determine what state to show
// 	const isLoading = !invite

// 	// Check if current user is already a recipient
// 	const currentUserRecipient = invite?.recipient?.find(r => r.userId === session?.user?.id)

// 	// Check if user has already requested access (from localStorage or session)
// 	useEffect(() => {
// 		if (status === "authenticated" && token) {
// 			const hasRequested = sessionStorage.getItem(`requested-access-${token}`)
// 			if (hasRequested === "true") {
// 				setHasRequestedAccess(true)
// 			}
// 		}
// 	}, [status, token])

// 	// Note: Removed the automatic reset logic as it was causing issues
// 	// The recipient should remain approved once they are approved

// 	if (!token) {
// 		return (
// 			<div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-rose-50 dark:from-indigo-950/20 dark:via-gray-900 dark:to-rose-950/20">
// 				<div className="flex min-h-screen items-center justify-center p-6">
// 					<div className="text-center">
// 						<XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
// 						<h1 className="text-xl font-semibold text-gray-900 dark:text-white">
// 							Invalid Invitation
// 						</h1>
// 						<p className="mt-2 text-gray-600 dark:text-gray-400">
// 							This invitation link is invalid or has expired.
// 						</p>
// 					</div>
// 				</div>
// 			</div>
// 		)
// 	}

// 	if (status === "unauthenticated") {
// 		return (
// 			<div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-rose-50 dark:from-indigo-950/20 dark:via-gray-900 dark:to-rose-950/20">
// 				<div className="flex min-h-screen items-center justify-center p-6">
// 					<div className="text-center">
// 						<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
// 						<p className="text-gray-600 dark:text-gray-400">Redirecting to login...</p>
// 					</div>
// 				</div>
// 			</div>
// 		)
// 	}

// 	const fadeUpVariants = {
// 		hidden: { opacity: 0, y: 30 },
// 		visible: { opacity: 1, y: 0 },
// 	}

// 	// Debug: Log invite data to understand the state
// 	console.log("🔍 Invite data:", invite)
// 	console.log("🔍 Has requested access:", hasRequestedAccess)
// 	console.log("🔍 Recipient status:", invite?.recipient?.[0]?.status)
// 	console.log("🔍 Current user ID:", session?.user?.id)
// 	console.log("🔍 Current user recipient:", currentUserRecipient)
// 	console.log("🔍 Envelope data:", envelopeData)
// 	console.log("🔍 Envelope documents:", envelopeDocuments)
// 	console.log("🔍 First document:", firstDocument)
// 	console.log("🔍 Token:", token)
// 	console.log("🔍 DocumentId from URL:", documentId)

// 	const shouldShowRequestAccess =
// 		!isLoading &&
// 		!hasRequestedAccess &&
// 		(!currentUserRecipient || currentUserRecipient.status === "PENDING")
// 	const shouldShowWaitingForApproval =
// 		!isLoading &&
// 		hasRequestedAccess &&
// 		currentUserRecipient?.status === "REQUESTED"
// 	const shouldShowApproved =
// 		!isLoading && currentUserRecipient?.status === "APPROVED"
// 	const shouldShowRejected =
// 		!isLoading && currentUserRecipient?.status === "REJECTED"

// 	console.log("🔍 Should show request access:", shouldShowRequestAccess)
// 	console.log("🔍 Should show waiting for approval:", shouldShowWaitingForApproval)
// 	console.log("🔍 Should show approved:", shouldShowApproved)
// 	console.log("🔍 Should show rejected:", shouldShowRejected)

// 	return (
// 		<div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-rose-50 dark:from-indigo-950/20 dark:via-gray-900 dark:to-rose-950/20">
// 			{/* Elegant Background Shapes */}
// 			<div className="absolute inset-0 overflow-hidden">
// 				<ElegantShape
// 					delay={0.3}
// 					width={300}
// 					height={500}
// 					rotate={-8}
// 					borderRadius={24}
// 					gradient="from-indigo-500/[0.15] dark:from-indigo-500/[0.08]"
// 					className="top-[-10%] left-[-15%]"
// 				/>

// 				<ElegantShape
// 					delay={0.5}
// 					width={600}
// 					height={200}
// 					rotate={15}
// 					borderRadius={20}
// 					gradient="from-rose-500/[0.15] dark:from-rose-500/[0.08]"
// 					className="right-[-20%] bottom-[-5%]"
// 				/>

// 				<ElegantShape
// 					delay={0.4}
// 					width={300}
// 					height={300}
// 					rotate={24}
// 					borderRadius={32}
// 					gradient="from-violet-500/[0.15] dark:from-violet-500/[0.08]"
// 					className="top-[40%] left-[-5%]"
// 				/>

// 				<ElegantShape
// 					delay={0.6}
// 					width={250}
// 					height={100}
// 					rotate={-20}
// 					borderRadius={12}
// 					gradient="from-amber-500/[0.15] dark:from-amber-500/[0.08]"
// 					className="top-[5%] right-[10%]"
// 				/>

// 				<ElegantShape
// 					delay={0.7}
// 					width={400}
// 					height={150}
// 					rotate={35}
// 					borderRadius={16}
// 					gradient="from-emerald-500/[0.15] dark:from-emerald-500/[0.08]"
// 					className="top-[45%] right-[-10%]"
// 				/>
// 			</div>

// 			{/* Main Content */}
// 			<div className="relative z-10 flex min-h-screen items-center justify-center p-6">
// 				<motion.div
// 					initial="hidden"
// 					animate="visible"
// 					variants={fadeUpVariants}
// 					transition={{ duration: 0.8, ease: "easeOut" }}
// 					className="w-full max-w-2xl"
// 				>
// 					{/* Enhanced Dialog Card */}
// 					<div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/80 shadow-2xl backdrop-blur-xl dark:border-gray-800/50 dark:bg-gray-900/80">
// 						{/* Gradient Border Effect */}
// 						<div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-rose-500/10" />

// 						<div className="relative p-8">
// 							{/* Header */}
// 							<motion.div
// 								variants={fadeUpVariants}
// 								transition={{ delay: 0.2 }}
// 								className="mb-8 text-center"
// 							>
// 								<div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
// 									<FileText className="h-8 w-8 text-white" />
// 								</div>
// 								<h1 className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-3xl font-bold text-transparent dark:from-white dark:to-gray-300">
// 									You have been invited to sign
// 								</h1>
// 								<p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
// 									Review the details below and request access to proceed with signing this document.
// 								</p>
// 							</motion.div>

// 							{/* Envelope Details */}
// 							<motion.div
// 								variants={fadeUpVariants}
// 								transition={{ delay: 0.4 }}
// 								className="mb-8 rounded-xl border border-gray-200/50 bg-gradient-to-r from-gray-50 to-gray-100 p-6 dark:border-gray-700/50 dark:from-gray-800 dark:to-gray-700"
// 							>
// 								<div className="flex items-start space-x-4">
// 									<div className="flex-shrink-0">
// 										<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
// 											<FileText className="h-6 w-6 text-white" />
// 										</div>
// 									</div>
// 									<div className="min-w-0 flex-1">
// 										<p className="text-sm font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
// 											Document for Signature
// 										</p>
// 										<h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
// 											{envelopeData?.title ?? firstDocument?.name ?? "Loading document..."}
// 										</h2>
// 										<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
// 											You&apos;ll need to position your signature fields on the document before
// 											signing.
// 										</p>
// 									</div>
// 								</div>

// 								{/* Security Notice */}
// 								<div className="mt-4 flex items-center rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
// 									<Shield className="mr-3 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
// 									<p className="text-sm text-blue-800 dark:text-blue-200">
// 										This is a secure digital signature request. Your signature will be legally
// 										binding.
// 									</p>
// 								</div>
// 							</motion.div>

// 							{/* Action Buttons or Waiting State */}
// 							{shouldShowWaitingForApproval ? (
// 								<motion.div
// 									variants={fadeUpVariants}
// 									transition={{ delay: 0.6 }}
// 									className="text-center"
// 								>
// 									<div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
// 										<ClockIcon className="h-8 w-8 text-white" />
// 									</div>
// 									<h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
// 										Access Requested
// 									</h3>
// 									<p className="mb-6 text-gray-600 dark:text-gray-400">
// 										Please wait until the host approves your request. You will be notified once your
// 										access is granted.
// 									</p>
// 									<div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 dark:border-amber-800 dark:from-amber-900/20 dark:to-orange-900/20">
// 										<div className="flex items-center justify-center space-x-2">
// 											<div className="h-4 w-4 animate-spin rounded-full border-b-2 border-amber-600"></div>
// 											<span className="text-sm font-medium text-amber-800 dark:text-amber-200">
// 												Waiting for approval...
// 											</span>
// 										</div>
// 									</div>
// 								</motion.div>
// 							) : shouldShowApproved ? (
// 								<motion.div
// 									variants={fadeUpVariants}
// 									transition={{ delay: 0.6 }}
// 									className="text-center"
// 								>
// 									{true ? (
// 										<>
// 											<div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
// 												<CheckCircle className="h-8 w-8 text-white" />
// 											</div>
// 											<h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
// 												Ready to Sign!
// 											</h3>
// 											<p className="mb-6 text-gray-600 dark:text-gray-400">
// 												Your request has been approved and signature fields are ready. Click the
// 												button below to proceed to the signing page.
// 											</p>
// 											<Button
// 												onClick={() => {
// 													// Use the documentId from the user's recipient record to ensure they go to the correct document
// 													const targetDocumentId =
// 														currentUserRecipient?.documentId ?? documentId ?? firstDocument?.id

// 													// Validate that we have the required IDs
// 													if (!envelopeData?.id || !targetDocumentId) {
// 														console.error("Missing envelopeId or documentId:", {
// 															envelopeId: envelopeData?.id,
// 															documentId: targetDocumentId,
// 															userRecipientDocumentId: currentUserRecipient?.documentId,
// 															urlDocumentId: documentId,
// 															firstDocumentId: firstDocument?.id,
// 														})
// 														return
// 													}

// 													console.log("🔍 Navigating to document:", {
// 														envelopeId: envelopeData.id,
// 														documentId: targetDocumentId,
// 														userRecipientDocumentId: currentUserRecipient?.documentId,
// 													})

// 													// Mark that the user has started the signing process
// 													sessionStorage.setItem(`started-signing-${token}`, "true")
// 													router.push(
// 														`/envelope/${envelopeData.id}/document/${targetDocumentId}/sign`
// 													)
// 												}}
// 												className="h-12 transform rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:from-green-700 hover:to-emerald-700 hover:shadow-xl"
// 											>
// 												<CheckCircle className="mr-2 h-5 w-5" />
// 												Proceed to Signing Page
// 											</Button>
// 										</>
// 									) : (
// 										<>
// 											<div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
// 												<CheckCircle className="h-8 w-8 text-white" />
// 											</div>
// 											<h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
// 												Access Approved
// 											</h3>
// 											<p className="mb-6 text-gray-600 dark:text-gray-400">
// 												Your request has been approved! You can now proceed to the signing page. The
// 												host may still be setting up signature fields.
// 											</p>
// 											<Button
// 												onClick={() => {
// 													// Use the documentId from the user's recipient record to ensure they go to the correct document
// 													const targetDocumentId =
// 														currentUserRecipient?.documentId ?? documentId ?? firstDocument?.id

// 													// Validate that we have the required IDs
// 													if (!envelopeData?.id || !targetDocumentId) {
// 														console.error("Missing envelopeId or documentId:", {
// 															envelopeId: envelopeData?.id,
// 															documentId: targetDocumentId,
// 															userRecipientDocumentId: currentUserRecipient?.documentId,
// 															urlDocumentId: documentId,
// 															firstDocumentId: firstDocument?.id,
// 														})
// 														return
// 													}

// 													console.log("🔍 Navigating to document:", {
// 														envelopeId: envelopeData.id,
// 														documentId: targetDocumentId,
// 														userRecipientDocumentId: currentUserRecipient?.documentId,
// 													})

// 													// Mark that the user has started the signing process
// 													sessionStorage.setItem(`started-signing-${token}`, "true")
// 													router.push(
// 														`/envelope/${envelopeData.id}/document/${targetDocumentId}/sign`
// 													)
// 												}}
// 												className="h-12 transform rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
// 											>
// 												<CheckCircle className="mr-2 h-5 w-5" />
// 												Proceed to Signing Page
// 											</Button>
// 										</>
// 									)}
// 								</motion.div>
// 							) : shouldShowRejected ? (
// 								<motion.div
// 									variants={fadeUpVariants}
// 									transition={{ delay: 0.6 }}
// 									className="text-center"
// 								>
// 									<div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 shadow-lg">
// 										<XCircle className="h-8 w-8 text-white" />
// 									</div>
// 									<h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
// 										Access Denied
// 									</h3>
// 									<p className="mb-6 text-gray-600 dark:text-gray-400">
// 										Your request to access this document has been declined by the host.
// 									</p>
// 									<Button
// 										onClick={() => router.push("/envelopes")}
// 										variant="outline"
// 										className="h-12 rounded-xl border-2 border-gray-300 font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
// 									>
// 										Go Back
// 									</Button>
// 								</motion.div>
// 							) : isLoading ? (
// 								<motion.div
// 									variants={fadeUpVariants}
// 									transition={{ delay: 0.6 }}
// 									className="text-center"
// 								>
// 									<div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gray-500 to-gray-600 shadow-lg">
// 										<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white"></div>
// 									</div>
// 									<h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
// 										Loading...
// 									</h3>
// 									<p className="mb-6 text-gray-600 dark:text-gray-400">
// 										Please wait while we load the invitation details.
// 									</p>
// 								</motion.div>
// 							) : shouldShowRequestAccess ? (
// 								<motion.div
// 									variants={fadeUpVariants}
// 									transition={{ delay: 0.6 }}
// 									className="flex flex-col gap-4 sm:flex-row"
// 								>
// 									<Button
// 										onClick={() => {
// 											// Store in sessionStorage that user has requested access
// 											sessionStorage.setItem(`requested-access-${token}`, "true")

// 											console.log("🔍 Requesting access with params:", {
// 												token,
// 												placeholder,
// 												documentId,
// 												hasPlaceholder: !!placeholder,
// 											})

// 											if (placeholder) {
// 												acceptWithPlaceholder.mutate({
// 													token,
// 													placeholderId: placeholder,
// 													documentId: documentId || undefined,
// 												})
// 											} else {
// 												accept.mutate({ token })
// 											}
// 										}}
// 										disabled={accept.isPending || acceptWithPlaceholder.isPending}
// 										className="h-12 flex-1 transform rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl"
// 									>
// 										{accept.isPending || acceptWithPlaceholder.isPending ? (
// 											<>
// 												<div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
// 												Requesting Access...
// 											</>
// 										) : (
// 											<>
// 												<CheckCircle className="mr-2 h-5 w-5" />
// 												Request Access
// 											</>
// 										)}
// 									</Button>

// 									<Button
// 										variant="outline"
// 										onClick={() => {
// 											decline.mutate({ token })
// 										}}
// 										disabled={decline.isPending}
// 										className="h-12 flex-1 rounded-xl border-2 border-gray-300 font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
// 									>
// 										{decline.isPending ? (
// 											<>
// 												<div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-gray-600"></div>
// 												Declining...
// 											</>
// 										) : (
// 											<>
// 												<XCircle className="mr-2 h-5 w-5" />
// 												Decline
// 											</>
// 										)}
// 									</Button>
// 								</motion.div>
// 							) : null}

// 							{/* Footer Note */}
// 							<motion.div
// 								variants={fadeUpVariants}
// 								transition={{ delay: 0.8 }}
// 								className="mt-6 text-center"
// 							>
// 								<p className="text-xs text-gray-500 dark:text-gray-400">
// 									By requesting access, you agree to sign this document electronically once approved
// 								</p>
// 							</motion.div>
// 						</div>
// 					</div>
// 				</motion.div>
// 			</div>

// 			{/* Bottom Gradient Overlay */}
// 			<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white via-transparent to-white/80 dark:from-gray-900 dark:via-transparent dark:to-gray-900/80" />
// 		</div>
// 	)
// }

export default function EnvelopeInvitePage() {
	return null
}
