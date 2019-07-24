process.env["NODE_CONFIG_DIR"] = __dirname + "/config/";
const
	assert = require('assert'),
	config = require("config"),
	mlog = require('mocha-logger');

// Libs to test
const MysqlDatabase = require("../lib/MysqlDatabase");
const TestRecord = require('./classes/TestRecord');

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
		TestRecord.createMockTable(dbh);
	});

	//
	//
	it('should use overloaded field', function() {
		const obj = new TestRecord();
		obj.name(this.test.fullTitle());
		obj.managed_field("test");
		obj.commit();

		assert.deepEqual(
			{ called: obj._managedCalled },
			{ called: true }
		);
	});


});

