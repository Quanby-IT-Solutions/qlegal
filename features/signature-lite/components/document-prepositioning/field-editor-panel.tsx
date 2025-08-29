"use client"

import { useState } from "react"
import { AlertCircle, Save, Settings, X } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
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
import { Separator } from "@/core/components/ui/separator"
import { Switch } from "@/core/components/ui/switch"
import { Textarea } from "@/core/components/ui/textarea"

import type { DocumentField, Recipient } from "./pre-positioning-page"

interface FieldEditorPanelProps {
	field: DocumentField | null
	recipients: Recipient[]
	onUpdate: (fieldId: string, updates: Partial<DocumentField>) => void
	onDelete: (fieldId: string) => void
	onClose: () => void
}

export default function FieldEditorPanel({
	field,
	recipients,
	onUpdate,
	onDelete,
	onClose
}: FieldEditorPanelProps) {
	const [localField, setLocalField] = useState<DocumentField | null>(field)
	const [hasChanges, setHasChanges] = useState(false)

	if (!field || !localField) {
		return null
	}

	const handleFieldChange = (updates: Partial<DocumentField>) => {
		const updatedField = { ...localField, ...updates }
		setLocalField(updatedField)
		setHasChanges(true)
	}

	const handleSave = () => {
		if (!localField) return

		onUpdate(localField.id, localField)
		setHasChanges(false)
		toast.success("Field updated successfully")
	}

	const handleDelete = () => {
		if (!localField) return

		if (window.confirm("Are you sure you want to delete this field?")) {
			onDelete(localField.id)
			onClose()
			toast.success("Field deleted")
		}
	}

	const selectedRecipient = recipients.find(
		(r) => r.id === localField.recipientId
	)

	return (
		<Card className="w-80 shadow-lg">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Settings className="h-4 w-4" />
						<CardTitle className="text-sm">Field Properties</CardTitle>
					</div>
					<div className="flex items-center gap-1">
						{hasChanges && (
							<Button size="sm" onClick={handleSave}>
								<Save className="h-3 w-3" />
							</Button>
						)}
						<Button variant="ghost" size="sm" onClick={onClose}>
							<X className="h-3 w-3" />
						</Button>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant="outline">{localField.type}</Badge>
					{selectedRecipient && (
						<div className="flex items-center gap-1">
							<div
								className="h-2 w-2 rounded-full"
								style={{ backgroundColor: selectedRecipient.color }}
							/>
							<span className="text-xs text-gray-600">
								{selectedRecipient.name}
							</span>
						</div>
					)}
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Basic Properties */}
				<div className="space-y-3">
					<div>
						<Label htmlFor="field-label" className="text-xs font-medium">
							Label
						</Label>
						<Input
							id="field-label"
							value={localField.label}
							onChange={(e) => handleFieldChange({ label: e.target.value })}
							placeholder="Field label"
							className="h-8"
						/>
					</div>

					<div>
						<Label htmlFor="field-placeholder" className="text-xs font-medium">
							Placeholder
						</Label>
						<Input
							id="field-placeholder"
							value={localField.placeholder ?? ""}
							onChange={(e) =>
								handleFieldChange({ placeholder: e.target.value })
							}
							placeholder="Placeholder text"
							className="h-8"
						/>
					</div>

					<div>
						<Label htmlFor="field-recipient" className="text-xs font-medium">
							Assigned To
						</Label>
						<Select
							value={localField.recipientId}
							onValueChange={(value) =>
								handleFieldChange({ recipientId: value })
							}
						>
							<SelectTrigger className="h-8">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{recipients.map((recipient, index) => (
									<SelectItem
										key={`${recipient.id}-${recipient.email}-${index}`}
										value={recipient.id}
									>
										<div className="flex items-center gap-2">
											<div
												className="h-2 w-2 rounded-full"
												style={{ backgroundColor: recipient.color }}
											/>
											{recipient.name}
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex items-center justify-between">
						<Label htmlFor="field-required" className="text-xs font-medium">
							Required Field
						</Label>
						<Switch
							id="field-required"
							checked={localField.required}
							onCheckedChange={(checked) =>
								handleFieldChange({ required: checked })
							}
						/>
					</div>
				</div>

				<Separator />

				{/* Position and Size */}
				<div className="space-y-3">
					<h4 className="text-xs font-medium text-gray-700">Position & Size</h4>

					<div className="grid grid-cols-2 gap-2">
						<div>
							<Label className="text-xs text-gray-600">X Position</Label>
							<Input
								type="number"
								value={Math.round(localField.position.x)}
								onChange={(e) =>
									handleFieldChange({
										position: {
											...localField.position,
											x: parseInt(e.target.value) || 0
										}
									})
								}
								className="h-7 text-xs"
							/>
						</div>
						<div>
							<Label className="text-xs text-gray-600">Y Position</Label>
							<Input
								type="number"
								value={Math.round(localField.position.y)}
								onChange={(e) =>
									handleFieldChange({
										position: {
											...localField.position,
											y: parseInt(e.target.value) || 0
										}
									})
								}
								className="h-7 text-xs"
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-2">
						<div>
							<Label className="text-xs text-gray-600">Width</Label>
							<Input
								type="number"
								value={Math.round(localField.size.width)}
								onChange={(e) =>
									handleFieldChange({
										size: {
											...localField.size,
											width: parseInt(e.target.value) || 0
										}
									})
								}
								className="h-7 text-xs"
							/>
						</div>
						<div>
							<Label className="text-xs text-gray-600">Height</Label>
							<Input
								type="number"
								value={Math.round(localField.size.height)}
								onChange={(e) =>
									handleFieldChange({
										size: {
											...localField.size,
											height: parseInt(e.target.value) || 0
										}
									})
								}
								className="h-7 text-xs"
							/>
						</div>
					</div>

					<div>
						<Label className="text-xs text-gray-600">Page</Label>
						<Input
							type="number"
							value={localField.position.pageNumber}
							onChange={(e) =>
								handleFieldChange({
									position: {
										...localField.position,
										pageNumber: parseInt(e.target.value) || 1
									}
								})
							}
							className="h-7 text-xs"
							min="1"
						/>
					</div>
				</div>

				{/* Options for checkbox/radio fields */}
				{(localField.type === "CHECKBOX" || localField.type === "RADIO") && (
					<>
						<Separator />
						<div className="space-y-3">
							<h4 className="text-xs font-medium text-gray-700">Options</h4>
							<Textarea
								value={localField.options?.join("\n") ?? ""}
								onChange={(e) =>
									handleFieldChange({
										options: e.target.value
											.split("\n")
											.filter((opt) => opt.trim())
									})
								}
								placeholder="Enter each option on a new line"
								className="h-20 text-xs"
							/>
							<p className="text-xs text-gray-500">
								Enter each option on a separate line
							</p>
						</div>
					</>
				)}

				<Separator />

				{/* Field Information */}
				<div className="space-y-2">
					<h4 className="text-xs font-medium text-gray-700">Information</h4>
					<div className="space-y-1 text-xs text-gray-600">
						<div>
							Field ID:{" "}
							<code className="rounded bg-gray-100 px-1 text-xs">
								{localField.id}
							</code>
						</div>
						<div>
							Type:{" "}
							<Badge variant="outline" className="text-xs">
								{localField.type}
							</Badge>
						</div>
						<div>Page: {localField.position.pageNumber}</div>
					</div>
				</div>

				{/* Actions */}
				<div className="flex gap-2 pt-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleSave}
						disabled={!hasChanges}
						className="flex-1"
					>
						<Save className="mr-1 h-3 w-3" />
						Save
					</Button>
					<Button
						variant="destructive"
						size="sm"
						onClick={handleDelete}
						className="flex-1"
					>
						<X className="mr-1 h-3 w-3" />
						Delete
					</Button>
				</div>

				{hasChanges && (
					<div className="flex items-center gap-2 rounded bg-amber-50 p-2 text-xs text-amber-600">
						<AlertCircle className="h-3 w-3" />
						You have unsaved changes
					</div>
				)}
			</CardContent>
		</Card>
	)
}
