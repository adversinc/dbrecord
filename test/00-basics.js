process.env["NODE_CONFIG_DIR"] = __dirname + "/config/";
const
	assert = require('assert'),
	config = require("config");

// Libs to test
const MysqlDatabase = require("../lib/MysqlDatabase").default;
const TestRecord = require('./classes/TestRecord');

// Tests
describe('DbRecord basic ops', function() {
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

	it('should create a row', function() {
		const obj = new TestRecord();
		obj.name(this.test.fullTitle());
		obj.commit();

		// Checks
		const TABLE_NAME  = obj._table();
		const row = dbh.querySync(`SELECT * FROM ${TABLE_NAME}`);
		assert.deepEqual(row, [ { id: 1, name: this.test.fullTitle(), field2: null } ]);
	});
});

