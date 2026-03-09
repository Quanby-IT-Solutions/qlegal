"use client"

import Image from "next/image"
import { ChevronDown } from "lucide-react"

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
	const selectedItem = countries.find(c => c.value === value) ?? null

	return (
		<Field data-slot="country-combobox">
			<FieldContent>
				<FieldTitle>Country</FieldTitle>
				<Combobox<CountryItem>
					items={countries}
					value={selectedItem}
					defaultValue={countries[0]}
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
								<span className="flex min-w-0 flex-1 items-center gap-2 text-left">
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
												<span className="truncate">{item.label}</span>
											</span>
										)}
									</ComboboxValue>
								</span>
								<ChevronDown className="text-muted-foreground ml-2 size-4 shrink-0" />
							</Button>
						}
					/>
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

