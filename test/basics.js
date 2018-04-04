process.env["NODE_CONFIG_DIR"] = __dirname + "/config/";
const
	assert = require('assert'),
	config = require("config");

// Libs to test
const MysqlDatabase = require("../lib/mysql-queries").default;
const TestRecord = require('./classes/TestRecord');

// Tests
describe('DbRecord basic ops', function() {
	let dbh = null;
	before(function() {
		dbh = new MysqlDatabase(config.get("mysql"));
	});

	it('should create a row', function() {
		TestRecord.createMockTable(dbh);

		const obj = new TestRecord(dbh);
		obj.name("Test name");
		obj.commit();

		// Checks
		const TABLE_NAME  = obj._table();
		const row = dbh.querySync(`SELECT * FROM ${TABLE_NAME}`);
		assert.deepEqual(row, [ { id: 1, name: 'Test name', field2: null } ]);
	});
});

