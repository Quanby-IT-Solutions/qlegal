"use client"

import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxTrigger,
	ComboboxValue,
} from "@/core/components/ui/combobox"
import { Field, FieldContent, FieldTitle } from "@/core/components/ui/field"
import { Button } from "@/core/components/ui/button"

import { getDocumentTypes } from "../lib/supported-documents"

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
	const selected = items.find(d => d.value === value) ?? items[0]

	return (
		<Field data-slot="document-type-combobox">
			<FieldContent>
				<FieldTitle>Document Type</FieldTitle>
				<Combobox
					items={items}
					value={selected}
					onChange={item => onChange(item?.value ?? selected?.value ?? "")}
					itemToStringValue={item => item.label}
				>
					<ComboboxTrigger
						render={
							<Button
								variant="outline"
								className="h-11 w-full justify-between font-normal"
								disabled={disabled}
							/>
						}
					>
						<ComboboxValue placeholder="Select document">
							{item => <span>{item.label}</span>}
						</ComboboxValue>
					</ComboboxTrigger>
					<ComboboxContent>
						<ComboboxInput showTrigger={false} placeholder="Search document" />
						<ComboboxEmpty>No documents found.</ComboboxEmpty>
						<ComboboxList>
							{item => (
								<ComboboxItem key={item.value} value={item}>
									<span>{item.label}</span>
								</ComboboxItem>
							)}
						</ComboboxList>
					</ComboboxContent>
				</Combobox>
			</FieldContent>
		</Field>
	)
}

