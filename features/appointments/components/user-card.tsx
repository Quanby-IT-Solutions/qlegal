"use client"

import { X } from "lucide-react"

import { Avatar } from "@/core/components/ui/avatar"
import { Button } from "@/core/components/ui/button"
import { cn } from "@/core/lib/utils"

interface UserCardProps {
	name: string
	email: string
	avatar?: string
	onRemove: () => void
}

export function UserCard({ name, email, avatar, onRemove }: UserCardProps) {
	return (
		<div className="bg-background flex items-center justify-between rounded-full border p-2 pr-3 shadow-sm">
			<div className="flex items-center gap-3">
				<Avatar className="size-8 border">
					{avatar ? (
						<Avatar.Image src={avatar} alt={name} />
					) : (
						<Avatar.Fallback>{name.charAt(0).toUpperCase()}</Avatar.Fallback>
					)}
				</Avatar>
				<div className="flex flex-col">
					<span className="text-sm font-medium">{name}</span>
					<span className="text-muted-foreground text-xs">{email}</span>
				</div>
			</div>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				onClick={onRemove}
				className="hover:bg-destructive/10 h-8 w-8 rounded-full"
			>
				<X className="size-4" />
			</Button>
		</div>
	)
}
