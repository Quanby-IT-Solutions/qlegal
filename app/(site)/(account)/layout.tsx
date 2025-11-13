import { Navbar } from "@/features/home/components/navbar"

export default function Layout(props: LayoutProps<"/">) {
	return (
		<div className="min-h-screen">
			<Navbar />
			{props.children}
		</div>
	)
}
