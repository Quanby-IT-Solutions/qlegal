"use client"

import Image from "next/image"

import { Button } from "@/core/components/ui/button"
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

import { getCountries } from "../lib/supported-documents"

const countries = getCountries()

type CountryItem = (typeof countries)[number]

interface CountryComboboxProps {
	value: string
	onChange: (value: string) => void
	disabled?: boolean
}

export function CountryCombobox({ value, onChange, disabled }: CountryComboboxProps) {
	const selectedItem = countries.find(c => c.value === value) ?? countries[0]

	return (
		<Field data-slot="country-combobox">
			<FieldContent>
				<FieldTitle>Country</FieldTitle>
				<Combobox<CountryItem>
					items={countries}
					value={selectedItem}
					onChange={item => onChange(item?.value ?? selectedItem.value)}
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
						<ComboboxValue<CountryItem> placeholder="Select country">
							{item => (
								<span className="flex items-center gap-2">
									<Image
										src={`https://flagcdn.com/${item.code.toLowerCase()}.svg`}
										alt=""
										width={16}
										height={16}
										className="rounded-xs"
									/>
									<span>{item.label}</span>
                                </span>
							)}
						</ComboboxValue>
					</ComboboxTrigger>
					<ComboboxContent>
						<ComboboxInput showTrigger={false} placeholder="Search country" />
						<ComboboxEmpty>No countries found.</ComboboxEmpty>
						<ComboboxList>
							{item => (
								<ComboboxItem<CountryItem> key={item.value} value={item}>
									<Image
										src={`https://flagcdn.com/${item.code.toLowerCase()}.svg`}
										alt=""
										width={16}
										height={12}
										className="rounded-xs"
									/>
									<span className="ml-2">{item.label}</span>
								</ComboboxItem>
							)}
						</ComboboxList>
					</ComboboxContent>
				</Combobox>
			</FieldContent>
		</Field>
	)
}

