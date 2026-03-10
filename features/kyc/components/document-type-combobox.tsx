"use client"

import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "@/core/components/ui/combobox"
import { Field, FieldContent, FieldTitle } from "@/core/components/ui/field"

import { getDocumentTypes } from "../lib/supported-documents"

type DocumentTypeItem = ReturnType<typeof getDocumentTypes>[number]

interface DocumentTypeComboboxProps {
	countryId: string
	value: string
	onChange: (value: string) => void
	disabled?: boolean
}

export function DocumentTypeCombobox({
	countryId,
	value,
	onChange,
	disabled,
}: DocumentTypeComboboxProps) {
	const items = getDocumentTypes(countryId)
	const selectedItem = items.find(d => d.value === value) ?? null

	return (
		<Field data-slot="document-type-combobox">
			<FieldContent>
				<FieldTitle>Document Type</FieldTitle>
				<Combobox<DocumentTypeItem>
					items={items}
					value={selectedItem}
					itemToStringValue={(item: DocumentTypeItem | null) => item?.label ?? ""}
				>
					<ComboboxInput placeholder="Select document" disabled={disabled} />
					<ComboboxContent>
						<ComboboxEmpty>No documents found.</ComboboxEmpty>
						<ComboboxList>
							{(item: DocumentTypeItem) => (
								<ComboboxItem key={item.value} value={item} onClick={() => onChange(item.value)}>
									<span className="text-sm">{item.label}</span>
								</ComboboxItem>
							)}
						</ComboboxList>
					</ComboboxContent>
				</Combobox>
			</FieldContent>
		</Field>
	)
}
