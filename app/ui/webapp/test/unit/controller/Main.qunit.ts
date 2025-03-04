import Main from "ai/ui/controller/Main.controller";

QUnit.module("Sample Main controller test");

QUnit.test("The Main controller class has a onSelectEmail method", function (assert) {
	// as a very basic test example just check the presence of the "onSelectEmail" method
	assert.strictEqual(typeof Main.prototype.onSelectEmail, "function");
});
