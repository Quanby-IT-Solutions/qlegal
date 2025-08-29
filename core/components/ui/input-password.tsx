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
					className={cn(
						"hide-password-toggle border-input bg-background ring-offset-background file:text-foreground placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
						className
					)}
					ref={ref}
					{...props}
				/>
				<button
					type="button"
					tabIndex={-1}
					className="text-foreground focus-visible:ring-ring absolute top-1/2 right-0.5 -translate-y-1/2 rounded-md bg-transparent p-2 focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none [&>svg]:size-4 [&>svg]:shrink-0"
					onClick={() => setShowPassword(!showPassword)}
				>
					{showPassword ? <EyeOff /> : <Eye />}
					<span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
				</button>

				<style>{`
					.hide-password-toggle::-ms-reveal,
					.hide-password-toggle::-ms-clear {
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
