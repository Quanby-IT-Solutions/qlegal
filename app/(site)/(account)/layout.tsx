export default function Layout(props: LayoutProps<"/">) {
	return (
		<div className="min-h-screen">
			{props.children}
		</div>
	)
}
