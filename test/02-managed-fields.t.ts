import {describe, before, after, beforeEach, it} from "mocha";

process.env["NODE_CONFIG_DIR"] = __dirname + "/config/";
const
	assert = require('assert'),
	config = require("config"),
	mlog = require('mocha-logger');

// Libs to test
import MysqlDatabase from "../src/MysqlDatabase";
import TestRecordTS from "./classes/TestRecordTS";

// Tests
describe('DbRecord2 managed fields', function() {
	let dbh = null;
	before(function() {
		MysqlDatabase.masterConfig(config.get("mysql"));
		dbh = MysqlDatabase.masterDbh();
	});
	after(() => {
		MysqlDatabase.masterDbhDestroy();
	});

	beforeEach(() => {
		TestRecordTS.createMockTable(dbh);
	});

	//
	//
	it('should use overloaded field', function() {
		const obj = new TestRecordTS();
		obj.name(this.test.fullTitle());
		obj.managed_field("test");
		obj.commit();

		assert.deepEqual(
			{ called: obj._managedCalled },
			{ called: true }
		);
	});


});

