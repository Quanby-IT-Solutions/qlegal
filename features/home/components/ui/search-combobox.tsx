"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle, FileTextIcon, FolderIcon, SearchIcon } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandList,
} from "@/core/components/ui/command"
import { Input } from "@/core/components/ui/input"
import { cn } from "@/core/lib/utils"

import { ActionButton } from "./action-buttons"

export interface SearchOption {
	value: string
	label: string
	type: "document" | "envelope"
	description?: string
}

interface SearchComboboxProps {
	placeholders?: string[]
	options?: SearchOption[]
	value?: string
	onChange?: (value: string) => void
	onSelect?: (option: SearchOption) => void
	onCreateEnvelope?: () => void
	onCreateFolder?: () => void
	className?: string
	disabled?: boolean
}

// Simplified animated placeholders hook
function useAnimatedPlaceholders(placeholders: string[]) {
	const [currentIndex, setCurrentIndex] = useState(0)

	useEffect(() => {
		if (placeholders.length <= 1) {
			return
		}

		const interval = setInterval(() => {
			setCurrentIndex(prev => (prev + 1) % placeholders.length)
		}, 3000)

		return () => clearInterval(interval)
	}, [placeholders.length])

	return currentIndex
}

// Simplified animated placeholder component
function AnimatedPlaceholder({
	placeholders,
	currentIndex,
	show,
}: {
	placeholders: string[]
	currentIndex: number
	show: boolean
}) {
	if (!show) {
		return null
	}

	return (
		<div className="pointer-events-none absolute top-1/2 left-10 -translate-y-1/2">
			<AnimatePresence mode="wait">
				<motion.span
					key={currentIndex}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.3 }}
					className="text-muted-foreground text-sm"
				>
					{placeholders[currentIndex]}
				</motion.span>
			</AnimatePresence>
		</div>
	)
}

// Simplified search result item component
function SearchResultItem({
	option,
	onSelect,
}: {
	option: SearchOption
	onSelect: (option: SearchOption) => void
}) {
	const isDocument = option.type === "document"

	return (
		<CommandItem
			value={option.value}
			onSelect={() => onSelect(option)}
			className="flex cursor-pointer gap-3"
		>
			{isDocument ? (
				<FileTextIcon className="h-4 w-4 text-blue-500" />
			) : (
				<FolderIcon className="h-4 w-4 text-amber-500" />
			)}
			<div className="flex-1 text-start">
				<div className="font-medium">{option.label}</div>
				{option.description && (
					<div className="text-muted-foreground text-xs">{option.description}</div>
				)}
			</div>
			<span className="text-muted-foreground text-xs">{isDocument ? "Document" : "Envelope"}</span>
		</CommandItem>
	)
}

// Simplified search dropdown component with positioning
function SearchDropdown({
	isOpen,
	searchValue,
	filteredOptions,
	onSelect,
	containerRef,
}: {
	isOpen: boolean
	searchValue: string
	filteredOptions: SearchOption[]
	onSelect: (option: SearchOption) => void
	containerRef: React.RefObject<HTMLDivElement | null>
}) {
	const [position, setPosition] = useState<"below" | "above">("below")

	useEffect(() => {
		if (!isOpen || !containerRef.current) {
			return
		}

		const container = containerRef.current
		const containerRect = container.getBoundingClientRect()
		const dropdownHeight = 280 // Estimated max height
		const spaceBelow = window.innerHeight - containerRect.bottom
		const spaceAbove = containerRect.top

		// Position above if not enough space below but enough space above
		if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
			setPosition("above")
		} else {
			setPosition("below")
		}
	}, [isOpen, containerRef])

	if (!isOpen || !searchValue) {
		return null
	}

	const documentOptions = filteredOptions.filter(opt => opt.type === "document")
	const envelopeOptions = filteredOptions.filter(opt => opt.type === "envelope")

	return (
		<AnimatePresence>
			<motion.div
				className={cn(
					"bg-muted absolute z-50 w-full overflow-hidden rounded-lg border shadow-lg",
					position === "above" ? "bottom-full mb-2" : "top-12"
				)}
				initial={{ opacity: 0, height: 0 }}
				animate={{ opacity: 1, height: "auto" }}
				exit={{ opacity: 0, height: 0 }}
				transition={{ duration: 0.2 }}
			>
				<Command shouldFilter={false} className="rounded-b-none">
					<CommandList className="max-h-60 overflow-y-auto">
						{filteredOptions.length === 0 ? (
							<CommandEmpty>
								<div className="text-muted-foreground py-6 text-center text-sm">
									No results found.
								</div>
							</CommandEmpty>
						) : (
							<>
								{documentOptions.length > 0 && (
									<CommandGroup heading="Documents">
										{documentOptions.map(option => (
											<SearchResultItem key={option.value} option={option} onSelect={onSelect} />
										))}
									</CommandGroup>
								)}

								{envelopeOptions.length > 0 && (
									<CommandGroup heading="Envelopes">
										{envelopeOptions.map(option => (
											<SearchResultItem key={option.value} option={option} onSelect={onSelect} />
										))}
									</CommandGroup>
								)}
							</>
						)}
					</CommandList>
				</Command>

				<div className="border-t px-3 py-2">
					<div className="text-muted-foreground flex items-center justify-between text-xs">
						<span>Click to select</span>
						<span>ESC to cancel</span>
					</div>
				</div>
			</motion.div>
		</AnimatePresence>
	)
}

export function SearchCombobox({
	placeholders = ["Search documents...", "Find envelopes..."],
	options = [],
	value = "",
	onChange,
	onSelect,
	// Unused callbacks retained for API consistency
	onCreateEnvelope: _onCreateEnvelope,
	onCreateFolder: _onCreateFolder,
	className,
	disabled = false,
}: SearchComboboxProps) {
	const [searchValue, setSearchValue] = useState(value)
	const [isFocused, setIsFocused] = useState(false)
	const inputRef = useRef<HTMLInputElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const currentPlaceholder = useAnimatedPlaceholders(placeholders)

	const filteredOptions = options.filter(option =>
		option.label.toLowerCase().includes(searchValue.toLowerCase())
	)

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value
		setSearchValue(newValue)
		onChange?.(newValue)
	}

	const handleSelect = (option: SearchOption) => {
		setSearchValue(option.label)
		onChange?.(option.value)
		onSelect?.(option)
		setIsFocused(false)
		inputRef.current?.blur()
	}

	const showDropdown = Boolean(isFocused && searchValue && filteredOptions.length > 0)

	return (
		<div className={cn("mx-auto w-full max-w-md", className)}>
			<div ref={containerRef} className="relative">
				<div className="flex w-full items-center gap-2">
					<div className="relative flex-1">
						<Input
							ref={inputRef}
							type="text"
							value={searchValue}
							onChange={handleInputChange}
							onFocus={() => setIsFocused(true)}
							onBlur={() => setTimeout(() => setIsFocused(false), 200)}
							disabled={disabled}
							placeholder=""
							className="dark:bg-muted/90 dark:hover:bg-muted/95 bg-white/90 pl-10 shadow-sm backdrop-blur-sm hover:bg-white/95 dark:border-white/10"
						/>
						<SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />

						<AnimatedPlaceholder
							placeholders={placeholders}
							currentIndex={currentPlaceholder}
							show={!searchValue}
						/>
					</div>

					<div className="flex gap-2">
						<ActionButton
							href="/envelopes"
							label="My Envelopes"
							Icon={FolderIcon}
							disabled={disabled}
						/>
					</div>
				</div>

				<SearchDropdown
					isOpen={showDropdown}
					searchValue={searchValue}
					filteredOptions={filteredOptions}
					onSelect={handleSelect}
					containerRef={containerRef}
				/>
			</div>
		</div>
	)
}
