import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { FlatCompat } from "@eslint/eslintrc"
import js from "@eslint/js"
import tanstackQuery from "@tanstack/eslint-plugin-query"
import drizzlePlugin from "eslint-plugin-drizzle"
import drizzlePlugin from "eslint-plugin-drizzle"
import reactHooks from "eslint-plugin-react-hooks"
import tseslint from "typescript-eslint"

// ============================================================================
// Configuration Setup
// ============================================================================

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
	baseDirectory: __dirname,
})

// ============================================================================
// Extended Configurations
// ============================================================================

/** Prettier configuration only (Next.js will be configured directly) */
const prettierConfig = compat.config({
	extends: ["prettier"],
})

// ============================================================================
// Rule Configurations
// ============================================================================

/** TypeScript-specific rules */
const typescriptRules = {
	"@typescript-eslint/array-type": "off",
	"@typescript-eslint/consistent-type-definitions": "off",
	"@typescript-eslint/consistent-type-imports": [
		"warn",
		{
			prefer: "type-imports",
			fixStyle: "inline-type-imports",
		},
	],
	"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
	"@typescript-eslint/no-explicit-any": "warn",
	"@typescript-eslint/require-await": "off",
	"@typescript-eslint/no-misused-promises": [
		"error",
		{
			checksVoidReturn: {
				attributes: false,
			},
		},
	],
}

/** Core JavaScript/TypeScript best practices */
const javascriptRules = {
	"no-console": "warn",
	"eqeqeq": ["error", "always"],
	// "curly": ["error", "all"],
	"prefer-const": "error",
	"no-var": "error",
	"object-shorthand": "error",
	"prefer-template": "error",
	"no-unreachable": "warn",
	"no-duplicate-imports": "error",
	"no-unused-expressions": "error",
	"no-return-await": "error",
}

/** Security-focused rules */
const securityRules = {
	"no-eval": "error",
	"no-implied-eval": "error",
	"no-new-func": "error",
	"no-script-url": "error",
}

/** Framework and library-specific rules */
const frameworkRules = {
	// React Hooks
	...reactHooks.configs.recommended.rules,

	// Next.js rules (configured directly to avoid circular references)
	...nextPlugin.configs.recommended.rules,
	...nextPlugin.configs["core-web-vitals"].rules,

	// TanStack Query
	"@tanstack/query/exhaustive-deps": "error",
	"@tanstack/query/no-rest-destructuring": "warn",
	"@tanstack/query/stable-query-client": "error",

	// Drizzle ORM
	"drizzle/enforce-delete-with-where": ["error", { drizzleObjectName: ["db"] }],
	"drizzle/enforce-update-with-where": ["error", { drizzleObjectName: ["db"] }],
}

/** Project-specific restrictions */
const projectRestrictions = {
	"no-restricted-properties": [
		"error",
		{
			object: "process",
			property: "env",
			message: "Use `import { env } from '@/env'` instead to ensure validated types.",
		},
	],
	"no-restricted-imports": [
		"error",
		{
			name: "process",
			importNames: ["env"],
			message: "Use `import { env } from '@/env'` instead to ensure validated types.",
		},
		{
			name: "zod",
			message: "Use 'zod/v4' instead to ensure v4.",
		},
	],
}

// ============================================================================
// ESLint Configuration
// ============================================================================

const eslintConfig = tseslint.config(
	// Global ignores
	{
		ignores: [
			"postcss.config.mjs",
			"tailwind.config.ts",
			".next/**",
			"node_modules/**",
			"next-env.d.ts",
		],
	},

	// Prettier configuration
	...prettierConfig,

	// Base JavaScript recommendations
	js.configs.recommended,

	// Main TypeScript/React configuration
	{
		files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
		ignores: ["next-env.d.ts"],

		extends: [
			...tseslint.configs.recommended,
			...tseslint.configs.recommendedTypeChecked,
			...tseslint.configs.stylisticTypeChecked,
		],

		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},

		plugins: {
			"@typescript-eslint": tseslint.plugin,
			"react-hooks": reactHooks,
			"@tanstack/query": tanstackQuery,
			"drizzle": drizzlePlugin,
			"@next/next": nextPlugin,
		},

		rules: {
			...typescriptRules,
			...javascriptRules,
			...securityRules,
			...frameworkRules,
			...projectRestrictions,
		},
	},

	// JavaScript-specific configuration (minimal overrides)
	{
		files: ["**/*.js", "**/*.mjs"],
		languageOptions: {
			globals: { process: "readonly" },
		},
		rules: {
			"@typescript-eslint/no-var-requires": "off",
			"no-restricted-properties": "off",
			"no-restricted-imports": "off",
		},
	}
)

export default eslintConfig
