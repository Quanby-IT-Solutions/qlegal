/** @type {import('prettier').Config & import('@ianvs/prettier-plugin-sort-imports').PluginConfig & import('prettier-plugin-tailwindcss').PluginOptions} */
const config = {
	// Modern formatting preferences
	bracketSameLine: false,
	bracketSpacing: true,
	arrowParens: "avoid",
	endOfLine: "lf",

	// Import sorting configuration
	importOrder: [
		"^(next/(.*)$)|^(next$)|^(react/(.*)$)|^(react$)", // Next.js and React.js modules
		"<BUILTIN_MODULES>", // Node.js built-in modules
		"<THIRD_PARTY_MODULES>", // NPM packages
		"",
		"^@/core/(.*)$",
		"",
		"^@/services/(.*)$",
		"",
		"^@/features/(.*)$",
		"",
		"^@/(.*)$",
		"",
		"^(?!.*[.]css$)[./].*$",
		".css$",
	],
	importOrderParserPlugins: ["typescript", "jsx", "decorators-legacy"],

	// Modern formatting rules
	printWidth: 100,
	quoteProps: "consistent",
	semi: false,
	singleQuote: false,
	tabWidth: 2,
	trailingComma: "es5",
	useTabs: true,

	// Plugins
	plugins: ["@ianvs/prettier-plugin-sort-imports", "prettier-plugin-tailwindcss"],

	// Additional modern settings
	proseWrap: "preserve",
	htmlWhitespaceSensitivity: "css",
}

export default config
