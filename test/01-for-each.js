process.env["NODE_CONFIG_DIR"] = __dirname + "/config/";
const
	assert = require('assert'),
	config = require("config");

// Libs to test
const MysqlDatabase = require("../lib/MysqlDatabase").default;
const TestRecord = require('./classes/TestRecord');

// Tests
describe('DbRecord record iteration', function() {
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
	it('should go through all rows', function() {
		// Create records
		const source = [];
		for(let i = 0; i < 5; i++) {
			const obj = new TestRecord();
			obj.name(this.test.fullTitle() + "#" + i);
			obj.commit();
		}

		// Checks
		const res = [];
		TestRecord.forEach({ DEBUG_SQL_QUERY: 1 }, (itm, options) => {
			res.push({ id: itm.id(), name: itm.name() });
		});

		assert.deepEqual(res, [
			{ id: 1, name: "DbRecord record iteration should go through all rows#0" },
			{ id: 2, name: "DbRecord record iteration should go through all rows#1" },
			{ id: 3, name: "DbRecord record iteration should go through all rows#2" },
			{ id: 4, name: "DbRecord record iteration should go through all rows#3" },
			{ id: 5, name: "DbRecord record iteration should go through all rows#4" },
		]);
	});

});

