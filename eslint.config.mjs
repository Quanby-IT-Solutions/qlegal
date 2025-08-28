import js from "@eslint/js"
import nextPlugin from "@next/eslint-plugin-next"
import tanstackQuery from "@tanstack/eslint-plugin-query"
import reactHooks from "eslint-plugin-react-hooks"
import tseslint from "typescript-eslint"

// ESLint v9 flat config for TypeScript and React/Next.js projects
export default tseslint.config(
	// Global ignores
	{
		ignores: ["postcss.config.mjs", "tailwind.config.ts", ".next/**", "node_modules/**"],
	},

	// Base JavaScript config
	js.configs.recommended,

	// Main configuration for all TypeScript files
	{
		files: ["**/*.ts", "**/*.tsx"],
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
			"@next/next": nextPlugin,
			"@tanstack/query": tanstackQuery,
		},
		rules: {
			// TypeScript rules (matching your original config)
			"@typescript-eslint/array-type": "off",
			"@typescript-eslint/consistent-type-definitions": "off",
			"@typescript-eslint/consistent-type-imports": [
				"warn",
				{
					prefer: "type-imports",
					fixStyle: "inline-type-imports",
				},
			],
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					argsIgnorePattern: "^_",
				},
			],
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

			// Modern JavaScript/TypeScript best practices
			"no-console": "warn",
			"eqeqeq": ["error", "always"],
			"curly": ["error", "all"],
			"prefer-const": "error",
			"no-var": "error",
			"object-shorthand": "error",
			"prefer-template": "error",
			"no-unreachable": "warn",
			"no-duplicate-imports": "error",
			"no-unused-expressions": "error",
			"no-return-await": "error",

			// Security and best practices
			"no-eval": "error",
			"no-implied-eval": "error",
			"no-new-func": "error",
			"no-script-url": "error",

			// React Hooks rules
			...reactHooks.configs.recommended.rules,

			// TanStack Query rules
			"@tanstack/query/exhaustive-deps": "error",
			"@tanstack/query/no-rest-destructuring": "warn",
			"@tanstack/query/stable-query-client": "error",

			// Environment access restrictions
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
		},
	},

	// JavaScript files (if any)
	{
		files: ["**/*.js", "**/*.mjs"],
		languageOptions: {
			parser: tseslint.parser,
			globals: {
				process: "readonly",
			},
		},
		rules: {
			"@typescript-eslint/no-var-requires": "off",
			"no-restricted-properties": "off",
			"no-restricted-imports": "off",
		},
	}
)
