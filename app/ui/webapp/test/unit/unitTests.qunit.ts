// https://api.qunitjs.com/config/autostart/
QUnit.config.autostart = false;

// import all your QUnit tests here
Promise.all([import("unit/controller/Main.qunit")]).then(() => {
	QUnit.start();
});
