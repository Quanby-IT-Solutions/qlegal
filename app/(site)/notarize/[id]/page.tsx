"use client"

import type { Route } from "next"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import {
	AlertCircle,
	Camera,
	CheckCircle,
	Clock,
	Download,
	Eye,
	FileText,
	Handshake,
	Loader2,
	Lock,
	Mail,
	MapPin,
	Mic,
	MicOff,
	Pause,
	PenTool,
	Phone,
	Play,
	Shield,
	Square,
	User,
	Users,
	Video,
	VideoOff,
} from "lucide-react"

import { SiteNavbar } from "@/core/components/navbar/site-navbar"
import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
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
import { Progress } from "@/core/components/ui/progress"
import { Separator } from "@/core/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"

import { trpc } from "@/services/trpc/client"

export default function NotarizePage() {
	const params = useParams()
	const notarizationId = params.id as string

	// Fetch notarization session data from backend
	const {
		data: notarization,
		isLoading,
		error,
	} = trpc.appointments.getNotarizationSession.useQuery(
		{ sessionId: notarizationId },
		{ enabled: !!notarizationId }
	)

	const [isVideoOn, setIsVideoOn] = useState(true)
	const [isMicOn, setIsMicOn] = useState(true)
	const [isRecording, setIsRecording] = useState(false)
	const [recordingTime, setRecordingTime] = useState(0)
	const [currentStep, setCurrentStep] = useState(1)
	const [requirements, setRequirements] = useState({
		identityVerified: false,
		documentsScanned: false,
		witnessPresent: false,
		videoRecording: false,
	})

	// Timer for recording
	useEffect(() => {
		let interval: NodeJS.Timeout
		if (isRecording) {
			interval = setInterval(() => {
				setRecordingTime(prev => prev + 1)
			}, 1000)
		}
		return () => clearInterval(interval)
	}, [isRecording])

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
	}

	const handleRequirementChange = (requirement: keyof typeof requirements, checked: boolean) => {
		setRequirements(prev => ({
			...prev,
			[requirement]: checked,
		}))
	}

	const handleStartRecording = () => {
		setIsRecording(true)
		setRecordingTime(0)
		handleRequirementChange("videoRecording", true)
	}

	const handleStopRecording = () => {
		setIsRecording(false)
	}

	const handleCompleteNotarization = () => {
		// Complete notarization logic
		console.log("Completing notarization...")
	}

	// Update requirements when notarization data loads
	useEffect(() => {
		if (notarization?.requirements) {
			setRequirements(notarization.requirements)
		}
	}, [notarization])

	// Loading state
	if (isLoading) {
		return (
			<>
				<SiteNavbar items={[{ label: "Notarization", url: "/notarizations/active" }]} />
				<div className="flex min-h-screen items-center justify-center">
					<Card className="w-96">
						<CardContent className="py-12 text-center">
							<Loader2 className="text-muted-foreground mx-auto mb-4 h-12 w-12 animate-spin" />
							<h3 className="mb-2 text-lg font-medium">Loading Session</h3>
							<p className="text-muted-foreground text-sm">
								Please wait while we load the notarization session...
							</p>
						</CardContent>
					</Card>
				</div>
			</>
		)
	}

	// Error or not found state
	if (error || !notarization) {
		return (
			<>
				<SiteNavbar items={[{ label: "Notarization", url: "/notarizations/active" }]} />
				<div className="flex min-h-screen items-center justify-center">
					<Card className="w-96">
						<CardContent className="py-12 text-center">
							<AlertCircle className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
							<h3 className="mb-2 text-lg font-medium">Notarization Not Found</h3>
							<p className="text-muted-foreground mb-4 text-sm">
								{error?.message ??
									"The notarization session you're looking for doesn't exist or you don't have access to it."}
							</p>
							<Button onClick={() => window.history.back()}>Go Back</Button>
						</CardContent>
					</Card>
				</div>
			</>
		)
	}

	const isREN = notarization.workflow === "REN"
	const isIEN = notarization.workflow === "IEN"
	const allRequirementsMet = Object.values(requirements).every(Boolean)

	// Construct route with proper typing
	const notarizeUrl: Route = `/notarize/${notarizationId}` as unknown as Route

	return (
		<>
			<SiteNavbar
				items={[
					{ label: "Notarizations", url: "/notarizations?tab=active" as Route },
					{ label: notarization.title, url: notarizeUrl },
				]}
			/>

			<div className="bg-muted/30 min-h-screen">
				<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
					{/* Header */}
					<div className="mb-8">
						<div className="flex items-center justify-between">
							<div>
								<h1 className="text-3xl font-bold tracking-tight">{notarization.title}</h1>
								<p className="text-muted-foreground mt-2">
									{isREN
										? "Remote Electronic Notarization (REN)"
										: "In-Person Electronic Notarization (IEN)"}
								</p>
							</div>
							<Badge variant={isREN ? "default" : "secondary"} className="text-sm">
								{isREN ? (
									<>
										<Video className="mr-1 h-3 w-3" />
										REN
									</>
								) : (
									<>
										<Handshake className="mr-1 h-3 w-3" />
										IEN
									</>
								)}
							</Badge>
						</div>
					</div>

					<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
						{/* Main Content */}
						<div className="space-y-6 lg:col-span-2">
							{/* Video/Meeting Section */}
							{isREN && (
								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<Video className="h-5 w-5" />
											Video Session
										</CardTitle>
										<CardDescription>
											Remote notarization requires active video recording
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="space-y-4">
											{/* Video Controls */}
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-2">
													<Button
														variant={isVideoOn ? "default" : "destructive"}
														size="sm"
														onClick={() => setIsVideoOn(!isVideoOn)}
													>
														{isVideoOn ? (
															<Camera className="h-4 w-4" />
														) : (
															<VideoOff className="h-4 w-4" />
														)}
														{isVideoOn ? "Video On" : "Video Off"}
													</Button>
													<Button
														variant={isMicOn ? "default" : "destructive"}
														size="sm"
														onClick={() => setIsMicOn(!isMicOn)}
													>
														{isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
														{isMicOn ? "Mic On" : "Mic Off"}
													</Button>
												</div>

												{/* Recording Controls */}
												<div className="flex items-center gap-2">
													{!isRecording ? (
														<Button onClick={handleStartRecording} variant="destructive" size="sm">
															<Play className="mr-2 h-4 w-4" />
															Start Recording
														</Button>
													) : (
														<Button onClick={handleStopRecording} variant="outline" size="sm">
															<Square className="mr-2 h-4 w-4" />
															Stop Recording
														</Button>
													)}
													{isRecording && (
														<div className="flex items-center gap-2 text-sm">
															<div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
															<span className="font-mono">{formatTime(recordingTime)}</span>
														</div>
													)}
												</div>
											</div>

											{/* Video Placeholder */}
											<div className="flex aspect-video items-center justify-center rounded-lg bg-black">
												<div className="text-center text-white">
													<Video className="mx-auto mb-2 h-12 w-12" />
													<p className="text-sm">Video call in progress</p>
													<p className="text-xs text-gray-400">
														{isVideoOn ? "Camera active" : "Camera disabled"}
													</p>
												</div>
											</div>

											{/* Recording Notice */}
											<Alert>
												<AlertCircle className="h-4 w-4" />
												<AlertDescription>
													This session is being recorded for legal compliance. Recording will be
													stored securely and used only for notarization purposes.
												</AlertDescription>
											</Alert>
										</div>
									</CardContent>
								</Card>
							)}

							{/* Physical Presence Section for IEN */}
							{isIEN && (
								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<Handshake className="h-5 w-5" />
											Physical Presence Verification
										</CardTitle>
										<CardDescription>
											Verify that all parties are physically present
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="space-y-4">
											<div className="flex items-center gap-4">
												<Avatar className="h-12 w-12">
													<AvatarImage
														src={notarization.enp.avatar ?? undefined}
														alt={notarization.enp.name}
													/>
													<AvatarFallback>
														{notarization.enp.name
															.split(" ")
															.map(n => n[0])
															.join("")}
													</AvatarFallback>
												</Avatar>
												<div>
													<h4 className="font-medium">{notarization.enp.name}</h4>
													<p className="text-muted-foreground text-sm">{notarization.enp.title}</p>
													<div className="mt-1 flex items-center gap-2">
														<MapPin className="text-muted-foreground h-4 w-4" />
														<span className="text-sm">{notarization.location}</span>
													</div>
												</div>
											</div>

											<Separator />

											<div className="flex items-center gap-4">
												<Avatar className="h-12 w-12">
													<AvatarFallback>
														{notarization.principal.name
															.split(" ")
															.map(n => n[0])
															.join("")}
													</AvatarFallback>
												</Avatar>
												<div>
													<h4 className="font-medium">{notarization.principal.name}</h4>
													<p className="text-muted-foreground text-sm">Principal</p>
													<div className="mt-1 flex items-center gap-2">
														<CheckCircle className="h-4 w-4 text-green-600" />
														<span className="text-sm text-green-600">Present</span>
													</div>
												</div>
											</div>
										</div>
									</CardContent>
								</Card>
							)}

							{/* Documents Section */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<FileText className="h-5 w-5" />
										Documents to Notarize
									</CardTitle>
									<CardDescription>
										{notarization.documents.length} document
										{notarization.documents.length !== 1 ? "s" : ""} pending notarization
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="space-y-3">
										{notarization.documents.map(doc => (
											<div
												key={doc.id}
												className="flex items-center justify-between rounded-lg border p-3"
											>
												<div className="flex items-center gap-3">
													<FileText className="h-8 w-8 text-blue-600" />
													<div>
														<h4 className="font-medium">{doc.name}</h4>
														<p className="text-muted-foreground text-sm">{doc.pages} pages</p>
													</div>
												</div>
												<div className="flex items-center gap-2">
													<Badge
														variant={doc.status === "PENDING_SIGNATURE" ? "secondary" : "default"}
													>
														{doc.status === "PENDING_SIGNATURE" ? "Pending" : "Completed"}
													</Badge>
													<Button variant="outline" size="sm">
														<Eye className="mr-2 h-4 w-4" />
														View
													</Button>
													<Button size="sm">
														<PenTool className="mr-2 h-4 w-4" />
														Sign
													</Button>
												</div>
											</div>
										))}
									</div>
								</CardContent>
							</Card>
						</div>

						{/* Sidebar */}
						<div className="space-y-6">
							{/* Requirements Checklist */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Shield className="h-5 w-5" />
										Requirements Checklist
									</CardTitle>
									<CardDescription>
										Complete all requirements before finalizing notarization
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="space-y-4">
										{/* Identity Verification */}
										<div className="flex items-center space-x-2">
											<Checkbox
												id="identity"
												checked={requirements.identityVerified}
												onCheckedChange={checked =>
													handleRequirementChange("identityVerified", !!checked)
												}
											/>
											<Label htmlFor="identity" className="text-sm">
												{isREN
													? "Remote identity verification completed"
													: "Physical ID verification completed"}
											</Label>
										</div>

										{/* Document Scanning (IEN only) */}
										{isIEN && (
											<div className="flex items-center space-x-2">
												<Checkbox
													id="documents"
													checked={requirements.documentsScanned}
													onCheckedChange={checked =>
														handleRequirementChange("documentsScanned", !!checked)
													}
												/>
												<Label htmlFor="documents" className="text-sm">
													Physical documents scanned and uploaded
												</Label>
											</div>
										)}

										{/* Witness (IEN only) */}
										{isIEN && (
											<div className="flex items-center space-x-2">
												<Checkbox
													id="witness"
													checked={requirements.witnessPresent}
													onCheckedChange={checked =>
														handleRequirementChange("witnessPresent", !!checked)
													}
												/>
												<Label htmlFor="witness" className="text-sm">
													Witness present and verified (if required)
												</Label>
											</div>
										)}

										{/* Video Recording (REN only) */}
										{isREN && (
											<div className="flex items-center space-x-2">
												<Checkbox
													id="recording"
													checked={requirements.videoRecording}
													onCheckedChange={checked =>
														handleRequirementChange("videoRecording", !!checked)
													}
												/>
												<Label htmlFor="recording" className="text-sm">
													Video/audio recording active
												</Label>
											</div>
										)}

										{/* Progress */}
										<div className="pt-4">
											<div className="mb-2 flex items-center justify-between text-sm">
												<span>Progress</span>
												<span>
													{Object.values(requirements).filter(Boolean).length}/
													{Object.keys(requirements).length}
												</span>
											</div>
											<Progress
												value={
													(Object.values(requirements).filter(Boolean).length /
														Object.keys(requirements).length) *
													100
												}
												className="h-2"
											/>
										</div>
									</div>
								</CardContent>
							</Card>

							{/* Session Info */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Clock className="h-5 w-5" />
										Session Information
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="flex items-center gap-2">
										<Badge variant="outline">{isREN ? "Remote" : "In-Person"}</Badge>
									</div>
									<div className="space-y-2 text-sm">
										<div>
											<span className="font-medium">Started:</span>
											<span className="ml-2">
												{new Date(notarization.startTime).toLocaleString()}
											</span>
										</div>
										<div>
											<span className="font-medium">Duration:</span>
											<span className="ml-2">{notarization.estimatedDuration} minutes</span>
										</div>
										<div>
											<span className="font-medium">Location:</span>
											<span className="ml-2">{notarization.location}</span>
										</div>
									</div>
								</CardContent>
							</Card>

							{/* Complete Notarization */}
							<Card>
								<CardContent className="pt-6">
									<Button
										onClick={handleCompleteNotarization}
										disabled={!allRequirementsMet}
										className="w-full"
										size="lg"
									>
										<Lock className="mr-2 h-4 w-4" />
										Complete Notarization
									</Button>
									{!allRequirementsMet && (
										<p className="text-muted-foreground mt-2 text-center text-xs">
											Complete all requirements to finalize
										</p>
									)}
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</div>
		</>
	)
}
