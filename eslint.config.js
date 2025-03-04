import cds from "@sap/cds/eslint.config.mjs";
export default [
	{
		ignores: ["**/gen", "**/dist", "**/resources", "@cds-models"]
	},
	...cds.recommended
];
