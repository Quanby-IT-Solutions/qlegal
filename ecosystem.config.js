module.exports = {
	apps: [
		{
			name: "qsign-main",
			script: "pnpm",
			args: "start",
			env: {
				PORT: 3000,
			},
		},
	],
}
