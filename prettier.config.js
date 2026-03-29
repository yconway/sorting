const config = {
	arrowParens: "always",
	bracketSpacing: true,
	embeddedLanguageFormatting: "auto",
	endOfLine: "lf",
	bracketSameLine: false,
	// cursorOffset: 0,
	experimentalTernaries: true,
	// filepath: 'whatever', // used for CLI, implemented in config but don't use
	htmlWhitespaceSensitivity: "css", //https://prettier.io/blog/2018/11/07/1.15.0#whitespace-sensitive-formatting
	// insertPragma: false, // COOL feature, but not useful for me.  basically used with requirePragma to help onboard prettier
	jsxSingleQuote: false,
	// parser: '???', do not use, let prettier infer from file
	overrides: [],
	plugins: [],
	printWidth: 80,
	proseWrap: "preserve",
	quoteProps: "as-needed",
	// rangeEnd: 0,
	// rangeStart: 0,
	// requirePragma: false, //see insertPragma
	semi: false,
	singleAttributePerLine: true, // (HTML attributes) try both?
	singleQuote: false,
	tabWidth: 2,
	trailingComma: "all",
	useTabs: true,
	// vueIndentScriptAndStyle: false, //don't care since I don't use vue
}
module.exports = config
