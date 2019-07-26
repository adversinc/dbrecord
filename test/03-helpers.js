process.env["NODE_CONFIG_DIR"] = __dirname + "/config/";
const
	assert = require('assert'),
	config = require("config");

// Libs to test
const MysqlDatabase = require("../lib/MysqlDatabase");
const TestRecord = require('./classes/TestRecord');

// Tests
describe('DbRecord SET helper', function() {
	it('should add value to empty list', function() {
		let s = TestRecord.setFieldSet("", "NEW_OPTION");
		assert.equal(s, "NEW_OPTION");
	});

	it('should add value to existing list', function() {
		let s = TestRecord.setFieldSet("VALUE_1,VALUE_2", "NEW_OPTION");
		assert.equal(s, "VALUE_1,VALUE_2,NEW_OPTION");
	});

	it('should remove value from list', function() {
		let s = TestRecord.setFieldRemove("VALUE_1,VALUE_2,OLD_OPTION", "OLD_OPTION");
		assert.equal(s, "VALUE_1,VALUE_2");
	});

	it('should remove value from empty list', function() {
		let s = TestRecord.setFieldRemove("", "OLD_OPTION");
		assert.equal(s, "");
	});

	it('should detect value in list', function() {
		let s = "VALUE_1,VALUE_2,VALUE_3";
		assert.ok(TestRecord.setFieldCheck(s, "VALUE_2"));
	});

	it('should detect value in list', function() {
		let s = "VALUE_2";
		assert.ok(TestRecord.setFieldCheck(s, "VALUE_2"));
	});

	it('should not detect value in list', function() {
		let s = "VALUE_1,VALUE_2,VALUE_3";
		assert.ok(!TestRecord.setFieldCheck(s, "VALUE_4"));
	});

	it('should not detect value in empty list', function() {
		let s = "";
		assert.ok(!TestRecord.setFieldCheck(s, "VALUE_1"));
	});
});

