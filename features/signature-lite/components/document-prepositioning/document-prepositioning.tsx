"use client"

import PrePositioningPage from "./pre-positioning-page"
import type { DocumentField, Recipient } from "./pre-positioning-page"

interface DocumentPrePositioningProps {
	documentUrl: string
	documentId: string
	recipients: Recipient[]
	existingFields?: DocumentField[]
	onSave: (fields: DocumentField[]) => Promise<void>
	onFieldsChange?: (fields: DocumentField[]) => void
	hideSaveButton?: boolean
	onPreview?: () => void
	showFieldEditor?: boolean
	fieldsSaved?: boolean
	onAddRecipient?: () => void
	isAddingRecipient?: boolean
	onDeleteRecipient?: (recipientId: string) => void
	onRefresh?: () => Promise<void>
	onPendingSaveChange?: (isPending: boolean) => void
}

export default function DocumentPrePositioning({
	documentUrl,
	documentId,
	recipients,
	existingFields = [],
	onSave,
	onFieldsChange,
	hideSaveButton = false,
	fieldsSaved = false,
	onAddRecipient,
	isAddingRecipient = false,
	onDeleteRecipient,
	onRefresh,
	onPendingSaveChange
}: DocumentPrePositioningProps) {
	return (
		<div className="flex h-screen gap-4">
			{/* Main pre-positioning interface */}
			<div className="flex-1">
				<PrePositioningPage
					documentUrl={documentUrl}
					_documentId={documentId}
					recipients={recipients}
					existingFields={existingFields}
					_onSave={onSave}
					onFieldsChange={onFieldsChange}
					_hideSaveButton={hideSaveButton}
					fieldsSaved={fieldsSaved}
					onAddRecipient={onAddRecipient}
					isAddingRecipient={isAddingRecipient}
					onDeleteRecipient={onDeleteRecipient}
					_onRefresh={onRefresh}
					onPendingSaveChange={onPendingSaveChange}
				/>
			</div>
		</div>
	)
}
