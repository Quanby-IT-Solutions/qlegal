import { Footer } from "@/features/home/components/footer"
import { Hero } from "@/features/home/components/hero"
import { Navbar } from "@/features/home/components/navbar"

export default async function Page() {
	return (
		<div className="from-background via-background to-muted/20 flex flex-col bg-linear-to-br">
			<Navbar />

			{/* Content */}
			<div className="flex flex-1 flex-col">
				<Hero
					title1="Digitally Sign"
					title2="Documents"
					description="Instantly sign documents online—fast, secure, and legally binding. No hassle, just signatures."
				/>

				<Footer />
			</div>
		</div>
	)
}
