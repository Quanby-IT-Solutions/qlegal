"use client"

import { Button } from "@/core/components/ui/button"

export function DefaultSignatureForm() {
	return (
		<form>
			<div className="bg-background dark:bg-input/30 border-input aspect-[21/9] rounded-sm border"></div>
			<Button type="submit" className="mt-4">
				Update Default Signature
			</Button>
		</form>
	)
}
