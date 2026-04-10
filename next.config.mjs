/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {},
	// Only use standalone output when explicitly enabled via ENABLE_STANDALONE=true
	// This avoids Windows symlink permission issues during local builds
	// For Docker builds, set ENABLE_STANDALONE=true in the build environment
	output: process.env.ENABLE_STANDALONE === "true" ? "standalone" : undefined,
	typescript: { ignoreBuildErrors: true },
	typedRoutes: true,
	reactCompiler: true,
	serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
	devIndicators: {
		position: "bottom-right",
	},
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
