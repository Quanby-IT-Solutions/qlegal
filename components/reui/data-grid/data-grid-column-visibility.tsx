"use client"

import { type ReactElement } from "react"
import { type Table } from "@tanstack/react-table"

import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu"

import { getColumnHeaderLabel } from "@/components/reui/data-grid/data-grid"

function DataGridColumnVisibility<TData>({
	table,
	trigger,
}: {
	table: Table<TData>
	trigger: ReactElement<Record<string, unknown>>
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-37.5">
				<DropdownMenuGroup>
					<DropdownMenuLabel className="font-medium">Toggle Columns</DropdownMenuLabel>
					{table
						.getAllColumns()
						.filter(column => column.getCanHide())
						.map(column => {
							return (
								<DropdownMenuCheckboxItem
									key={column.id}
									className="capitalize"
									checked={column.getIsVisible()}
									onSelect={event => event.preventDefault()}
									onCheckedChange={value => column.toggleVisibility(!!value)}
								>
									{getColumnHeaderLabel(column)}
								</DropdownMenuCheckboxItem>
							)
						})}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

export { DataGridColumnVisibility }
