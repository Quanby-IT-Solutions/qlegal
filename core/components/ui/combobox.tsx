"use client"

import * as React from "react"

import { Button } from "@/core/components/ui/button"
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/core/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"
import { cn } from "@/core/lib/utils"

type BaseItem = Record<string, unknown>

interface ComboboxContextValue<TItem extends BaseItem> {
	items: TItem[]
	value: TItem | null
	onChange: (item: TItem | null) => void
	itemToStringValue?: (item: TItem) => string
}

const ComboboxContext = React.createContext<ComboboxContextValue<BaseItem> | null>(null)

function useComboboxContext<TItem extends BaseItem>() {
	const ctx = React.useContext(ComboboxContext)
	if (!ctx) {
		throw new Error("Combobox components must be used within <Combobox>")
	}
	return ctx as ComboboxContextValue<TItem>
}

interface ComboboxProps<TItem extends BaseItem> {
	items: TItem[]
	defaultValue?: TItem
	value?: TItem | null
	onChange?: (item: TItem | null) => void
	itemToStringValue?: (item: TItem) => string
	children: React.ReactNode
}

function ComboboxRoot<TItem extends BaseItem>({
	items,
	defaultValue,
	value: controlledValue,
	onChange,
	itemToStringValue,
	children,
}: ComboboxProps<TItem>) {
	const [uncontrolledValue, setUncontrolledValue] = React.useState<TItem | null>(defaultValue ?? null)
	const value = controlledValue ?? uncontrolledValue
	const [open, setOpen] = React.useState(false)

	const handleChange = React.useCallback(
		(item: TItem | null) => {
			if (controlledValue === undefined) {
				setUncontrolledValue(item)
			}
			onChange?.(item)
		},
		[controlledValue, onChange]
	)

	const contextValue = React.useMemo<ComboboxContextValue<TItem>>(
		() => ({
			items,
			value,
			onChange: handleChange,
			itemToStringValue,
		}),
		[items, value, handleChange, itemToStringValue]
	)

	return (
		<ComboboxContext.Provider value={contextValue as ComboboxContextValue<BaseItem>}>
			<Popover open={open} onOpenChange={setOpen}>
				{children}
			</Popover>
		</ComboboxContext.Provider>
	)
}

interface ComboboxTriggerProps extends React.ComponentProps<typeof Button> {
	render?: React.ComponentProps<typeof Button>["asChild"] extends true ? React.ReactElement : React.ReactElement
	children: React.ReactNode
}

function ComboboxTrigger({ render, children, className, ...props }: ComboboxTriggerProps) {
	const content = render ? React.cloneElement(render, { className: cn(render.props.className, className) }) : null

	return (
		<PopoverTrigger asChild>
			{content ?? <Button variant="outline" className={cn("justify-between", className)} {...props} />}
		</PopoverTrigger>
	)
}

interface ComboboxValueProps<TItem extends BaseItem> {
	children: (item: TItem) => React.ReactNode
	placeholder?: React.ReactNode
}

function ComboboxValueInner<TItem extends BaseItem>({ children, placeholder }: ComboboxValueProps<TItem>) {
	const { value } = useComboboxContext<TItem>()

	if (!value) {
		return <span className="text-muted-foreground">{placeholder ?? "Select"}</span>
	}

	return <>{children(value)}</>
}

function ComboboxValue<TItem extends BaseItem>(props: ComboboxValueProps<TItem>) {
	return <ComboboxValueInner {...props} />
}

interface ComboboxContentProps extends React.ComponentProps<typeof PopoverContent> {
	children: React.ReactNode
}

function ComboboxContent({ className, children, ...props }: ComboboxContentProps) {
	return (
		<PopoverContent
			className={cn(
				"max-w-(--anchor-width) min-w-(--anchor-width) p-0",
				className
			)}
			{...props}
		>
			<Command data-slot="combobox-command">{children}</Command>
		</PopoverContent>
	)
}

interface ComboboxInputProps extends React.ComponentProps<typeof CommandInput> {
	showTrigger?: boolean
}

function ComboboxInput({ className, showTrigger = true, ...props }: ComboboxInputProps) {
	return (
		<div className="flex items-center gap-2 border-b px-2 py-1.5">
			<CommandInput
				className={cn(
					"border-0 px-2 py-1 text-sm outline-none focus-visible:ring-0",
					!showTrigger && "pl-0",
					className
				)}
				{...props}
			/>
		</div>
	)
}

function ComboboxEmpty(props: React.ComponentProps<typeof CommandEmpty>) {
	return <CommandEmpty {...props} />
}

function ComboboxList({ children }: { children: (item: BaseItem) => React.ReactNode }) {
	const { items, itemToStringValue } = useComboboxContext<BaseItem>()

	return (
		<CommandList>
			<CommandGroup>
				{items.map(item => (
					<ComboboxItem key={itemToStringValue ? itemToStringValue(item) : (item as any).value ?? JSON.stringify(item)} value={item}>
						{children(item)}
					</ComboboxItem>
				))}
			</CommandGroup>
		</CommandList>
	)
}

interface ComboboxItemProps<TItem extends BaseItem> extends React.ComponentProps<typeof CommandItem> {
	value: TItem
	children: React.ReactNode
}

function ComboboxItem<TItem extends BaseItem>({ value, children, ...props }: ComboboxItemProps<TItem>) {
	const { onChange, itemToStringValue } = useComboboxContext<TItem>()

	return (
		<CommandItem
			onSelect={() => {
				onChange(value)
			}}
			value={itemToStringValue ? itemToStringValue(value) : String((value as any).value ?? "")}
			{...props}
		>
			{children}
		</CommandItem>
	)
}

export {
	ComboboxRoot as Combobox,
	ComboboxTrigger,
	ComboboxValue,
	ComboboxContent,
	ComboboxInput,
	ComboboxEmpty,
	ComboboxList,
	ComboboxItem,
}

