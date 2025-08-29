import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/core/lib/utils"

const InputPassword = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
	({ className, ...props }, ref) => {
		const [showPassword, setShowPassword] = React.useState(false)

		return (
			<div className="relative">
				<input
					type={showPassword ? "text" : "password"}
					data-slot="input"
					className={cn(
						"file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
						"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
						"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
						className
					)}
					ref={ref}
					{...props}
				/>

				<button
					type="button"
					tabIndex={-1}
					aria-pressed={showPassword}
					className="text-foreground focus-visible:ring-ring absolute top-1/2 right-0.5 -translate-y-1/2 rounded-md bg-transparent p-2 focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none [&>svg]:size-4 [&>svg]:shrink-0"
					onClick={() => setShowPassword(!showPassword)}
				>
					{showPassword ? <EyeOff /> : <Eye />}
					<span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
				</button>

				<style>{`
					/* Hide IE/Edge reveal button for inputs when using custom toggle */
					input::-ms-reveal,
					input::-ms-clear {
						visibility: hidden;
						pointer-events: none;
						display: none;
					}
				`}</style>
			</div>
		)
	}
)
InputPassword.displayName = "InputPassword"

export { InputPassword }
