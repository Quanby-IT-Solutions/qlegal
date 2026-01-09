import Image from "next/image"

import { cn } from "@/core/lib/utils"

export const QuanbyLogo: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, ...props }) => (
	<Image
		src="/LEGAL.png"
		alt="Quanby Legal Logo"
		className={cn("select-none", className)}
		fill={false}
		width={256}
		height={256}
		quality={100}
		priority={false}
		{...(props as Omit<
			React.ImgHTMLAttributes<HTMLImageElement>,
			"height" | "width" | "src" | "alt"
		>)}
	/>
)

export const QuanbyLogoText: React.FC<React.SVGProps<SVGSVGElement>> = ({
	className,
	...props
}) => (
	<Image
		src="/qsign.logo.text.png"
		alt="Logo"
		className={cn(className)}
		fill={false}
		width={64}
		height={64}
		priority={false}
		{...(props as Omit<
			React.ImgHTMLAttributes<HTMLImageElement>,
			"height" | "width" | "src" | "alt"
		>)}
	/>
)
