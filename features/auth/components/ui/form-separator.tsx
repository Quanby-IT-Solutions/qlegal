import { Separator } from "@/core/components/ui/separator"
import { cn } from "@/core/lib/utils"

export const FormSeparator = ({
	className,
	label,
	...props
}: React.ComponentProps<"div"> & { label: string }) => {
	return (
		<div data-slot="form-separator" className={cn("relative w-full", className)} {...props}>
			<Separator />
			<div className="absolute right-0 left-0 flex translate-y-[-50%] items-center justify-center">
				<span className="bg-card text-muted-foreground pointer-events-none px-2 text-xs leading-none select-none">
					{label}
				</span>
			</div>
		</div>
	)
}
