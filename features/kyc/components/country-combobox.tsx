"use client"

import Image from "next/image"

import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "@/core/components/ui/combobox"
import { Field, FieldContent, FieldTitle } from "@/core/components/ui/field"

import { getCountries } from "@/features/kyc/lib/supported-documents"

const countries = getCountries()

type CountryItem = (typeof countries)[number]

interface CountryComboboxProps {
	value: string
	onChange: (value: string) => void
	disabled?: boolean
}

export function CountryCombobox({ value, onChange, disabled }: CountryComboboxProps) {
	const selectedItem = countries.find(c => c.value === value) ?? null

	return (
		<Field data-slot="country-combobox">
			<FieldContent>
				<FieldTitle>Country</FieldTitle>
				<Combobox<CountryItem>
					items={countries}
					value={selectedItem}
					itemToStringValue={(item: CountryItem | null) => item?.label ?? ""}
				>
					<ComboboxInput placeholder="Select country" disabled={disabled} />
					<ComboboxContent>
						<ComboboxEmpty>No countries found.</ComboboxEmpty>
						<ComboboxList>
							{(item: CountryItem) => (
								<ComboboxItem key={item.value} value={item} onClick={() => onChange(item.value)}>
									<span className="flex items-center gap-2 text-sm">
										<Image
											src={`https://flagcdn.com/${item.code.toLowerCase()}.svg`}
											alt=""
											width={16}
											height={12}
											className="rounded-xs"
										/>
										<span>{item.label}</span>
									</span>
								</ComboboxItem>
							)}
						</ComboboxList>
					</ComboboxContent>
				</Combobox>
			</FieldContent>
		</Field>
	)
}
