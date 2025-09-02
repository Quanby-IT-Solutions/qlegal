"use client"

import { useState } from "react"
import { Mail, Plus, Trash2, User, Users } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "@/core/components/ui/select"

// Color palette for recipient visual distinction
const RECIPIENT_COLORS = [
	"#3B82F6", // Blue
	"#10B981", // Green
	"#F59E0B", // Yellow
	"#EF4444", // Red
	"#8B5CF6", // Purple
	"#06B6D4", // Cyan
	"#F97316", // Orange
	"#84CC16", // Lime
	"#EC4899", // Pink
	"#6B7280" // Gray
]

export interface Recipient {
	id: string
	email: string
	name: string
	role: "SIGNER" | "APPROVER" | "CC"
	color: string
	order: number
}

interface RecipientManagerProps {
	recipients: Recipient[]
	onRecipientsChange: (recipients: Recipient[]) => void
	maxRecipients?: number
}

export function RecipientManager({
	recipients,
	onRecipientsChange,
	maxRecipients = 10
}: RecipientManagerProps) {
	const [newRecipient, setNewRecipient] = useState<{
		email: string
		name: string
		role: "SIGNER" | "APPROVER" | "CC"
	}>({
		email: "",
		name: "",
		role: "SIGNER"
	})
	const [isAdding, setIsAdding] = useState(false)

	// Get next available color
	const getNextColor = (): string => {
		const usedColors = recipients.map((r) => r.color)
		return (
			RECIPIENT_COLORS.find((color) => !usedColors.includes(color)) ??
			RECIPIENT_COLORS[0]!
		)
	}

	// Validate email format
	const isValidEmail = (email: string) => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		return emailRegex.test(email)
	}

	// Check if email is already added
	const isEmailDuplicate = (email: string) => {
		return recipients.some((r) => r.email.toLowerCase() === email.toLowerCase())
	}

	// Add new recipient
	const handleAddRecipient = () => {
		if (!newRecipient.email.trim()) {
			toast.error("Email is required")
			return
		}

		if (!isValidEmail(newRecipient.email)) {
			toast.error("Please enter a valid email address")
			return
		}

		if (isEmailDuplicate(newRecipient.email)) {
			toast.error("This email has already been added")
			return
		}

		if (!newRecipient.name.trim()) {
			toast.error("Name is required")
			return
		}

		if (recipients.length >= maxRecipients) {
			toast.error(`Maximum ${maxRecipients} recipients allowed`)
			return
		}

		const recipient: Recipient = {
			id: `recipient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			email: newRecipient.email.trim(),
			name: newRecipient.name.trim(),
			role: newRecipient.role,
			color: getNextColor(),
			order: recipients.length + 1
		}

		onRecipientsChange([...recipients, recipient])

		// Reset form
		setNewRecipient({
			email: "",
			name: "",
			role: "SIGNER"
		})
		setIsAdding(false)

		toast.success(`${recipient.name} added as ${recipient.role.toLowerCase()}`)
	}

	// Remove recipient
	const handleRemoveRecipient = (id: string) => {
		const recipientToRemove = recipients.find((r) => r.id === id)
		if (!recipientToRemove) return

		const updatedRecipients = recipients
			.filter((r) => r.id !== id)
			.map((r, index) => ({ ...r, order: index + 1 })) // Reorder

		onRecipientsChange(updatedRecipients)
		toast.success(`${recipientToRemove.name} removed`)
	}

	// Update recipient role
	const handleRoleChange = (id: string, role: "SIGNER" | "APPROVER" | "CC") => {
		const updatedRecipients = recipients.map((r) =>
			r.id === id ? { ...r, role } : r
		)
		onRecipientsChange(updatedRecipients)
	}

	// Reorder recipients
	const handleReorder = (id: string, direction: "up" | "down") => {
		const currentIndex = recipients.findIndex((r) => r.id === id)
		if (currentIndex === -1) return

		const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
		if (newIndex < 0 || newIndex >= recipients.length) return

		const reorderedRecipients = [...recipients]
		const [movedRecipient] = reorderedRecipients.splice(currentIndex, 1)
		if (!movedRecipient) return

		reorderedRecipients.splice(newIndex, 0, movedRecipient)

		// Update order numbers
		const updatedRecipients = reorderedRecipients.map((r, index) => ({
			...r,
			order: index + 1
		}))

		onRecipientsChange(updatedRecipients)
	}

	const getRoleColor = (role: string) => {
		const colors = {
			SIGNER: "bg-blue-100 text-blue-800 border-blue-200",
			APPROVER: "bg-green-100 text-green-800 border-green-200",
			CC: "bg-gray-100 text-gray-800 border-gray-200"
		}
		return colors[role as keyof typeof colors] || colors.SIGNER
	}

	const getRoleDescription = (role: string) => {
		const descriptions = {
			SIGNER: "Required to sign the document",
			APPROVER: "Approves the document after signing",
			CC: "Receives a copy for information only"
		}
		return descriptions[role as keyof typeof descriptions] || ""
	}

	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Users className="h-5 w-5" />
					Recipients ({recipients.length})
				</CardTitle>
				<CardDescription>
					Add people who need to sign or review this document
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Existing Recipients */}
				{recipients.length > 0 && (
					<div className="space-y-3">
						<h4 className="text-sm font-medium text-gray-900">
							Added Recipients
						</h4>
						<div className="space-y-2">
							{recipients.map((recipient, index) => (
								<div
									key={`${recipient.id}-${recipient.email}-${index}`}
									className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
								>
									{/* Color indicator and order */}
									<div className="flex items-center gap-2">
										<div
											className="h-4 w-4 rounded-full border-2 border-white shadow-sm"
											style={{ backgroundColor: recipient.color }}
										/>
										<span className="w-4 text-sm font-medium text-gray-500">
											{recipient.order}
										</span>
									</div>

									{/* Recipient info */}
									<div className="min-w-0 flex-1">
										<div className="mb-1 flex items-center gap-2">
											<p className="truncate text-sm font-medium text-gray-900">
												{recipient.name}
											</p>
											<Badge
												variant="outline"
												className={`text-xs ${getRoleColor(recipient.role)}`}
											>
												{recipient.role}
											</Badge>
										</div>
										<p className="truncate text-xs text-gray-500">
											{recipient.email}
										</p>
									</div>

									{/* Role selector */}
									<Select
										value={recipient.role}
										onValueChange={(value: "SIGNER" | "APPROVER" | "CC") =>
											handleRoleChange(recipient.id, value)
										}
									>
										<SelectTrigger className="w-32">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="SIGNER">Signer</SelectItem>
											<SelectItem value="APPROVER">Approver</SelectItem>
											<SelectItem value="CC">CC</SelectItem>
										</SelectContent>
									</Select>

									{/* Reorder buttons */}
									<div className="flex flex-col gap-1">
										<Button
											variant="ghost"
											size="sm"
											className="h-6 w-6 p-0"
											onClick={() => handleReorder(recipient.id, "up")}
											disabled={index === 0}
										>
											↑
										</Button>
										<Button
											variant="ghost"
											size="sm"
											className="h-6 w-6 p-0"
											onClick={() => handleReorder(recipient.id, "down")}
											disabled={index === recipients.length - 1}
										>
											↓
										</Button>
									</div>

									{/* Remove button */}
									<Button
										variant="ghost"
										size="sm"
										className="text-red-500 hover:bg-red-50 hover:text-red-700"
										onClick={() => handleRemoveRecipient(recipient.id)}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Add New Recipient */}
				{!isAdding ? (
					<Button
						variant="outline"
						onClick={() => setIsAdding(true)}
						className="w-full"
						disabled={recipients.length >= maxRecipients}
					>
						<Plus className="mr-2 h-4 w-4" />
						Add Recipient
						{recipients.length >= maxRecipients && (
							<span className="ml-2 text-xs">
								(Max {maxRecipients} reached)
							</span>
						)}
					</Button>
				) : (
					<div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
						<h4 className="text-sm font-medium text-gray-900">
							Add New Recipient
						</h4>

						<div className="space-y-3">
							<div className="space-y-2">
								<Label htmlFor="recipient-name">Full Name</Label>
								<div className="relative">
									<User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
									<Input
										id="recipient-name"
										type="text"
										value={newRecipient.name}
										onChange={(e) =>
											setNewRecipient((prev) => ({
												...prev,
												name: e.target.value
											}))
										}
										placeholder="Enter full name"
										className="pl-10"
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="recipient-email">Email Address</Label>
								<div className="relative">
									<Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
									<Input
										id="recipient-email"
										type="email"
										value={newRecipient.email}
										onChange={(e) =>
											setNewRecipient((prev) => ({
												...prev,
												email: e.target.value
											}))
										}
										placeholder="Enter email address"
										className="pl-10"
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="recipient-role">Role</Label>
								<Select
									value={newRecipient.role}
									onValueChange={(value: "SIGNER" | "APPROVER" | "CC") =>
										setNewRecipient((prev) => ({ ...prev, role: value }))
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="SIGNER">
											<div>
												<div className="font-medium">Signer</div>
												<div className="text-xs text-gray-500">
													{getRoleDescription("SIGNER")}
												</div>
											</div>
										</SelectItem>
										<SelectItem value="APPROVER">
											<div>
												<div className="font-medium">Approver</div>
												<div className="text-xs text-gray-500">
													{getRoleDescription("APPROVER")}
												</div>
											</div>
										</SelectItem>
										<SelectItem value="CC">
											<div>
												<div className="font-medium">CC</div>
												<div className="text-xs text-gray-500">
													{getRoleDescription("CC")}
												</div>
											</div>
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="flex gap-2">
							<Button
								onClick={handleAddRecipient}
								disabled={!newRecipient.email || !newRecipient.name}
								className="flex-1"
							>
								Add Recipient
							</Button>
							<Button
								variant="outline"
								onClick={() => {
									setNewRecipient({ email: "", name: "", role: "SIGNER" })
									setIsAdding(false)
								}}
							>
								Cancel
							</Button>
						</div>
					</div>
				)}

				{/* Help text */}
				{recipients.length === 0 && (
					<div className="py-8 text-center text-gray-500">
						<Users className="mx-auto mb-4 h-12 w-12 text-gray-300" />
						<p className="text-sm font-medium">No recipients added yet</p>
						<p className="mt-1 text-xs">
							Add recipients who need to sign or review this document
						</p>
					</div>
				)}

				{/* Summary */}
				{recipients.length > 0 && (
					<div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
						<h4 className="mb-2 text-sm font-medium text-blue-900">
							Signing Order
						</h4>
						<div className="space-y-1">
							{recipients
								.filter((r) => r.role === "SIGNER")
								.map((recipient, index) => (
									<div key={recipient.id} className="text-sm text-blue-800">
										{index + 1}. {recipient.name} ({recipient.email})
									</div>
								))}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
