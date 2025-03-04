// @ts-nocheck
/* eslint-disable */
describe("QUnit test page", function () {
	"use strict";

	it("should pass unit tests", async function () {
		await browser.url("http://localhost:8081/test/unit/unitTests.qunit.html");
		await browser.getQUnitResults();
	});
});
