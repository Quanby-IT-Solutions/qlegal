import { dirname } from "path"
import { fileURLToPath } from "url"
import { FlatCompat } from "@eslint/eslintrc"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
	baseDirectory: __dirname
})

const eslintConfig = [
	{
		ignores: ["postcss.config.mjs", "tailwind.config.ts"]
	},
	...compat.config({
		parser: "@typescript-eslint/parser",
		parserOptions: {
			project: true
		},
		extends: [
			"next/core-web-vitals",
			"next/typescript",
			"prettier",
			"plugin:@typescript-eslint/recommended-type-checked",
			"plugin:@typescript-eslint/stylistic-type-checked",
			"plugin:@tanstack/query/recommended"
		],
		rules: {
			"@typescript-eslint/array-type": "off",
			"@typescript-eslint/consistent-type-definitions": "off",
			"@typescript-eslint/consistent-type-imports": [
				"warn",
				{
					prefer: "type-imports",
					fixStyle: "inline-type-imports"
				}
			],
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					argsIgnorePattern: "^_"
				}
			],
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/require-await": "off",
			"@typescript-eslint/no-misused-promises": [
				"error",
				{
					checksVoidReturn: {
						attributes: false
					}
				}
			],
			"no-unreachable": "warn"
		}
	})
]

export default eslintConfig
