"use client"

import React, { useEffect, useRef, useState } from "react"
import { Copy, Link2, Loader2, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Switch } from "@/core/components/ui/switch"
import { cn, getAvatarUrl } from "@/core/lib/utils"
import { trpc } from "@/services/trpc/client"

interface MeetingInviteDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	meetingId: string
	allowPublicLink: boolean
	onSetAllowPublicLink: (allow: boolean) => void
	isSettingAllowPublicLink?: boolean
	onInviteByEmail: (email: string) => void
	isInviting?: boolean
	onSuccess?: () => void
}

export function MeetingInviteDialog({
	open,
	onOpenChange,
	meetingId,
	allowPublicLink,
	onSetAllowPublicLink,
	isSettingAllowPublicLink,
	onInviteByEmail,
	isInviting,
	onSuccess,
}: MeetingInviteDialogProps) {
	const [email, setEmail] = useState("")
	const [debouncedQuery, setDebouncedQuery] = useState("")
	const [showSuggestions, setShowSuggestions] = useState(false)
	const wrapperRef = useRef<HTMLDivElement>(null)

	// Debounce search query (300ms)
	useEffect(() => {
		const q = email.trim()
		if (!q) {
			setDebouncedQuery("")
			return
		}
		const t = setTimeout(() => setDebouncedQuery(q), 300)
		return () => clearTimeout(t)
	}, [email])

	const { data: suggestions = [], isLoading: isLoadingSuggestions } =
		trpc.messages.searchUsers.useQuery(
			{ query: debouncedQuery },
			{ enabled: debouncedQuery.length >= 2 }
		)

	// Show suggestions when we have a query (and hide when query is cleared)
	useEffect(() => {
		if (debouncedQuery.length >= 2) setShowSuggestions(true)
		else setShowSuggestions(false)
	}, [debouncedQuery])

	// Close suggestions on click outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
				setShowSuggestions(false)
			}
		}
		document.addEventListener("mousedown", handleClickOutside)
		return () => document.removeEventListener("mousedown", handleClickOutside)
	}, [])

	const joinUrl =
		typeof window !== "undefined"
			? `${window.location.origin}/sessions/${meetingId}/join`
			: ""

	const handleCopyLink = () => {
		if (!joinUrl) return
		void navigator.clipboard.writeText(joinUrl).then(() => {
			toast.success("Link copied")
		})
	}

	const handleInviteByEmail = () => {
		const trimmed = email.trim().toLowerCase()
		if (!trimmed) return
		onInviteByEmail(trimmed)
		setEmail("")
		setShowSuggestions(false)
		onSuccess?.()
	}

	const handleSelectSuggestion = (userEmail: string) => {
		setEmail(userEmail)
		setShowSuggestions(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<UserPlus className="size-5" />
						Add people
					</DialogTitle>
					<DialogDescription>
						Copy the join link or invite someone by email to this meeting.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-5">
					{/* Share link section */}
					<div className="space-y-3">
						<div className="flex items-center justify-between gap-2">
							<Label
								htmlFor="allow-join-link"
								className="text-muted-foreground flex items-center gap-2 text-sm"
							>
								<Link2 className="size-4" />
								Allow others to join via link
							</Label>
							<Switch
								id="allow-join-link"
								checked={allowPublicLink}
								disabled={isSettingAllowPublicLink}
								onCheckedChange={onSetAllowPublicLink}
							/>
						</div>
						{allowPublicLink && (
							<div className="flex gap-2">
								<Input
									readOnly
									className="flex-1 truncate text-xs"
									value={joinUrl}
								/>
								<Button
									variant="outline"
									size="icon"
									className="shrink-0"
									onClick={handleCopyLink}
									title="Copy link"
								>
									<Copy className="size-4" />
								</Button>
							</div>
						)}
					</div>

					{/* Invite by email */}
					<div className="space-y-2">
						<Label htmlFor="invite-email" className="text-sm">
							Invite by email
						</Label>
						<div ref={wrapperRef} className="relative flex gap-2">
							<div className="relative flex-1">
								<Input
									id="invite-email"
									type="text"
									placeholder="Enter name or email"
									value={email}
									onChange={e => setEmail(e.target.value)}
									onFocus={() => {
										if (email.trim().length >= 2) setShowSuggestions(true)
									}}
									onBlur={() => {
										setTimeout(() => setShowSuggestions(false), 150)
									}}
									onKeyDown={e => {
										if (e.key === "Enter") handleInviteByEmail()
									}}
									autoComplete="off"
								/>
								{showSuggestions && debouncedQuery.length >= 2 && (
									<div
										className="border-border bg-popover text-popover-foreground absolute top-full z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border shadow-md"
										role="listbox"
									>
										{isLoadingSuggestions ? (
											<div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
												<Loader2 className="size-4 animate-spin" />
												Searching…
											</div>
										) : suggestions.length === 0 ? (
											<div className="px-3 py-2 text-sm text-muted-foreground">
												No users found
											</div>
										) : (
											suggestions.map(user => (
												<button
													key={user.id}
													type="button"
													role="option"
													className="hover:bg-accent focus:bg-accent flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm outline-none"
													onMouseDown={e => {
														e.preventDefault()
														handleSelectSuggestion(user.email ?? "")
													}}
												>
													<Avatar className="size-7 shrink-0">
														<AvatarImage src={getAvatarUrl(user.image) ?? undefined} />
														<AvatarFallback className="text-xs">
															{(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
														</AvatarFallback>
													</Avatar>
													<div className="min-w-0 flex-1 truncate">
														<span className="block truncate font-medium">{user.name ?? "No name"}</span>
														{user.email && (
															<span className="text-muted-foreground block truncate text-xs">
																{user.email}
															</span>
														)}
													</div>
												</button>
											))
										)}
									</div>
								)}
							</div>
							<Button
								onClick={handleInviteByEmail}
								disabled={!email.trim() || isInviting}
								className="shrink-0"
							>
								{isInviting ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									"Send"
								)}
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
