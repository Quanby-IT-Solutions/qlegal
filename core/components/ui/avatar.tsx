"use client"

import Image from "next/image"
import * as React from "react"
import { Avatar as AvatarPrimitive } from "radix-ui"

import { cn } from "@/core/lib/utils"

function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
	return (
		<AvatarPrimitive.Root
			data-slot="avatar"
			className={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full", className)}
			{...props}
		/>
	)
}

function AvatarImage({
	className,
	src,
	alt,
	...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
	if (src && typeof src === "string") {
		return (
			<Image
				src={src}
				alt={alt ?? "Avatar"}
				fill
				data-slot="avatar-image"
				className={cn("aspect-square object-cover", className)}
			/>
		)
	}

	return (
		<AvatarPrimitive.Image
			data-slot="avatar-image"
			className={cn("aspect-square size-full", className)}
			src={src}
			alt={alt}
			{...props}
		/>
	)
}

function AvatarFallback({
	className,
	...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
	return (
		<AvatarPrimitive.Fallback
			data-slot="avatar-fallback"
			className={cn("bg-muted flex size-full items-center justify-center rounded-full", className)}
			{...props}
		/>
	)
}

export { Avatar, AvatarImage, AvatarFallback }
