import { Navbar } from "@/features/home/components/navbar"
import { ShapesContainer } from "@/features/profile/components/shapes-container"

export default function Layout(props: LayoutProps<"/">) {
	return (
		<ShapesContainer>
			<Navbar isAuthenticated />
			{props.children}
		</ShapesContainer>
	)
}
