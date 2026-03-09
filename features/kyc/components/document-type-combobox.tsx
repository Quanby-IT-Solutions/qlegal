"use client"

import { Check, ChevronDown } from "lucide-react"

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
	const selected = items.find(d => d.value === value) ?? null

	return (
		<Field data-slot="document-type-combobox">
			<FieldContent>
				<FieldTitle>Document Type</FieldTitle>
				<Combobox
					items={items}
					value={selected}
					defaultValue={items[0]}
					onChange={item => onChange(item?.value ?? "")}
					itemToStringValue={item => item.label}
				>
					<ComboboxTrigger
						render={
							<Button
								variant="outline"
								className="h-11 w-full justify-between font-normal"
								disabled={disabled}
							>
								<span className="flex min-w-0 flex-1 items-center text-left">
									<ComboboxValue placeholder="Select document">
										{item => <span className="truncate">{item.label}</span>}
									</ComboboxValue>
								</span>
								<ChevronDown className="text-muted-foreground ml-2 size-4 shrink-0" />
							</Button>
						}
					/>
					<ComboboxContent>
						<ComboboxInput showTrigger={false} placeholder="Search document" />
						<ComboboxEmpty>No documents found.</ComboboxEmpty>
						<ComboboxList>
							{(item, isSelected) => (
								<ComboboxItem key={item.value} value={item}>
									<div className="flex w-full items-center justify-between gap-2">
										<span className="text-sm">{item.label}</span>
										{isSelected ? (
											<Check className="text-primary size-4 shrink-0" aria-hidden="true" />
										) : null}
									</div>
								</ComboboxItem>
							)}
						</ComboboxList>
					</ComboboxContent>
				</Combobox>
			</FieldContent>
		</Field>
	)
}

