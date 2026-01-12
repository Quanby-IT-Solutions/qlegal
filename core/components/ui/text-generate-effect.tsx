"use client"

import { useEffect } from "react"
import { motion, stagger, useAnimate } from "motion/react"

import { cn } from "@/core/lib/utils"

export const TextGenerateEffect = ({ words, className }: { words: string; className?: string }) => {
	const [scope, animate] = useAnimate()
	const wordsArray = words.split(" ")

	useEffect(() => {
		if (scope.current) {
			animate(
				"span",
				{
					opacity: 1,
					filter: "blur(0px)",
				},
				{
					duration: 2,
					delay: stagger(0.2),
				}
			)
		}
	}, [scope, animate])

	const renderWords = () => {
		return (
			<motion.div ref={scope}>
				{wordsArray.map((word, idx) => {
					return (
						<motion.span
							key={word + idx}
							className="mr-1.5 inline-block opacity-0 blur-[10px] filter"
						>
							{word}
						</motion.span>
					)
				})}
			</motion.div>
		)
	}

	return (
		<div className={cn("font-bold", className)}>
			<div className="mt-4">
				<div className="leading-snug tracking-wide">{renderWords()}</div>
			</div>
		</div>
	)
}
