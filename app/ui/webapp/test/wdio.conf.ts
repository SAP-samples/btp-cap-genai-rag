export const config = {
	specs: ["./**/*.test.ts"],

	suites: {
		unit: ["unit/*.test.ts"],
		opa: ["integration/*.test.ts"]
	},

	capabilities: [
		{
			browserName: "chrome",
			browserVersion: "stable",
			"goog:chromeOptions": {
				args: ["headless", "disable-gpu", "window-size=1024,768"]
			}
		}
	],

	logLevel: "warn",
	framework: "mocha",
	reporters: ["spec"],
	waitforTimeout: 90000,

	services: ["qunit"],

	mochaOpts: {
		ui: "bdd",
		timeout: 90000
	}
};
