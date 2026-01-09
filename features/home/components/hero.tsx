"use client"

import { Pacifico } from "next/font/google"
import { motion } from "motion/react"

import { ElegantShape } from "@/core/components/elegant-shape"
import { cn } from "@/core/lib/utils"

import { SearchCombobox } from "@/features/home/components/ui/search-combobox"

const pacifico = Pacifico({
	subsets: ["latin"],
	weight: ["400"],
	variable: "--font-pacifico",
	display: "swap",
	fallback: ["cursive", "system-ui"],
})

export function Hero({
	title1 = "This is my",
	title2 = "Title",
	description = "This is my description",
}: {
	title1?: string
	title2?: string
	description?: string
}) {
	const fadeUpVariants = {
		hidden: { opacity: 0, y: 30 },
		visible: { opacity: 1, y: 0 },
	}

	return (
		<HeroContainer>
			<div className="relative z-10 container mx-auto px-4 md:px-6">
				<div className="mx-auto max-w-3xl text-center">
					<motion.div
						variants={fadeUpVariants}
						initial="hidden"
						animate="visible"
						transition={{
							duration: 1,
							delay: 0.7,
							ease: "easeOut",
						}}
					>
					<h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl md:mb-8 md:text-8xl">
						<span className="font-bold bg-gradient-to-b from-black/90 to-black/70 bg-clip-text text-transparent dark:from-white dark:to-white/80">
							{title1}
						</span>
						<br className="my-2" />
						<span
							className={cn(
								"font-bold bg-gradient-to-r from-indigo-400 to-rose-400 bg-clip-text text-transparent dark:from-indigo-400 dark:to-rose-400",
								pacifico.className
							)}
						>
							{title2}
						</span>
					</h1>
					</motion.div>

					<motion.div
						variants={fadeUpVariants}
						initial="hidden"
						animate="visible"
						transition={{
							duration: 1,
							delay: 0.9,
							ease: "easeOut",
						}}
					>
						<p className="mx-auto mb-8 max-w-xl px-4 text-base leading-relaxed font-light tracking-wide text-black/40 sm:text-lg md:text-xl dark:text-white/40">
							{description}
						</p>
					</motion.div>

					<motion.div
						variants={fadeUpVariants}
						initial="hidden"
						animate="visible"
						transition={{
							duration: 1,
							delay: 1.3,
							ease: "easeOut",
						}}
					>
						<SearchCombobox
							placeholders={["Search documents...", "Find envelopes...", "Browse files..."]}
							options={[
								{
									value: "doc-1",
									label: "Contract Agreement",
									type: "document",
									description: "Legal contract for services",
								},
								{
									value: "doc-2",
									label: "Invoice Template",
									type: "document",
									description: "Monthly billing template",
								},
								{
									value: "doc-3",
									label: "Employee Handbook",
									type: "document",
									description: "Company policies and procedures",
								},
								{
									value: "env-1",
									label: "Legal Documents",
									type: "envelope",
									description: "Collection of legal files",
								},
								{
									value: "env-2",
									label: "HR Forms",
									type: "envelope",
									description: "Human resources documentation",
								},
								{
									value: "env-3",
									label: "Financial Records",
									type: "envelope",
									description: "Accounting and finance files",
								},
							]}
							onChange={(value: string) => {
								// eslint-disable-next-line no-console
								console.log("Search value changed:", value)
							}}
							onSelect={(option: { value: string; label: string; type: string }) => {
								// eslint-disable-next-line no-console
								console.log("Option selected:", option)
							}}
							onCreateEnvelope={() => {
								// eslint-disable-next-line no-console
								console.log("Create new envelope clicked")
							}}
							onCreateFolder={() => {
								// eslint-disable-next-line no-console
								console.log("Create new folder clicked")
							}}
							className="mx-auto"
						/>
					</motion.div>
				</div>
			</div>
		</HeroContainer>
	)
}

export default function HeroContainer({ children }: { children: React.ReactNode }) {
	return (
		<section className="overflow-x relative flex min-h-screen w-full items-center justify-center bg-white dark:bg-[#030303]">
			<div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] via-transparent to-rose-500/[0.02] blur-3xl dark:from-indigo-500/[0.05] dark:via-transparent dark:to-rose-500/[0.05]" />

			<div className="absolute inset-0 overflow-hidden">
				{/* Tall rectangle - top left */}
				<ElegantShape
					delay={0.3}
					width={300}
					height={500}
					rotate={-8}
					borderRadius={24}
					gradient="from-indigo-500/[0.65] dark:from-indigo-500/[0.45]"
					className="top-[-10%] left-[-15%]"
				/>

				{/* Wide rectangle - bottom right */}
				<ElegantShape
					delay={0.5}
					width={600}
					height={200}
					rotate={15}
					borderRadius={20}
					gradient="from-rose-500/[0.65] dark:from-rose-500/[0.45]"
					className="right-[-20%] bottom-[-5%]"
				/>

				{/* Square - middle left */}
				<ElegantShape
					delay={0.4}
					width={300}
					height={300}
					rotate={24}
					borderRadius={32}
					gradient="from-violet-500/[0.65] dark:from-violet-500/[0.45]"
					className="top-[40%] left-[-5%]"
				/>

				{/* Small rectangle - top right */}
				<ElegantShape
					delay={0.6}
					width={250}
					height={100}
					rotate={-20}
					borderRadius={12}
					gradient="from-amber-500/[0.65] dark:from-amber-500/[0.45]"
					className="top-[5%] right-[10%]"
				/>

				{/* New shapes */}
				{/* Medium rectangle - center right */}
				<ElegantShape
					delay={0.7}
					width={400}
					height={150}
					rotate={35}
					borderRadius={16}
					gradient="from-emerald-500/[0.65] dark:from-emerald-500/[0.45]"
					className="top-[45%] right-[-10%]"
				/>

				{/* Small square - bottom left */}
				<ElegantShape
					delay={0.2}
					width={200}
					height={200}
					rotate={-25}
					borderRadius={28}
					gradient="from-blue-500/[0.65] dark:from-blue-500/[0.45]"
					className="bottom-[10%] left-[20%]"
				/>

				{/* Tiny rectangle - top center */}
				<ElegantShape
					delay={0.8}
					width={150}
					height={80}
					rotate={45}
					borderRadius={10}
					gradient="from-purple-500/[0.65] dark:from-purple-500/[0.45]"
					className="top-[15%] left-[40%]"
				/>

				{/* Wide rectangle - middle */}
				<ElegantShape
					delay={0.9}
					width={450}
					height={120}
					rotate={-12}
					borderRadius={18}
					gradient="from-teal-500/[0.65] dark:from-teal-500/[0.45]"
					className="top-[60%] left-[25%]"
				/>
			</div>

			{children}
		</section>
	)
}
