/** @type {import('next').NextConfig} */
const nextConfig = {
	output: "standalone",
	typedRoutes: true,
	reactCompiler: true,
	images: {
		qualities: [100, 75],
		remotePatterns: [
			{
				protocol: "https",
				hostname: "vsgztvwubvuevuvfmoxh.supabase.co",
				port: "",
				pathname: "/storage/v1/object/public/**",
			},
			{
				protocol: "https",
				hostname: "lh3.googleusercontent.com",
				port: "",
				pathname: "/**",
			},
		],
	},
}

export default nextConfig
