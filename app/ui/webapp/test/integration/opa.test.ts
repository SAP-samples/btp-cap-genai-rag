// @ts-nocheck
/* eslint-disable */
describe("QUnit test page", function () {
	"use strict";

	it("should pass OPA5 tests", async function () {
		await browser.url("http://localhost:8081/test/integration/opaTests.qunit.html");
		await browser.getQUnitResults();
	});
});
