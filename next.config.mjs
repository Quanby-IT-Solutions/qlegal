/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		optimizePackageImports: ["@services/doconchain"],
	},
	// Only use standalone output when explicitly enabled via ENABLE_STANDALONE=true
	// This avoids Windows symlink permission issues during local builds
	// For Docker builds, set ENABLE_STANDALONE=true in the build environment
	output: process.env.ENABLE_STANDALONE === "true" ? "standalone" : undefined,
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
