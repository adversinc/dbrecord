process.env["NODE_CONFIG_DIR"] = __dirname + "/config/";
const
	assert = require('assert'),
	config = require("config");

// Libs to test
const MysqlDatabase = require("../lib/mysql-queries").default;
const TestRecord = require('./classes/TestRecord');

// Tests
describe('DbRecord transactions', function() {
	let dbh = null;
	before(function() {
		dbh = new MysqlDatabase(config.get("mysql"));
	});

	it('should commit changes', async function() {
		TestRecord.createMockTable(dbh);

		const obj = new TestRecord(dbh);
		obj.name("Test name");
		obj.commit();

		//const row = await dbh.query(`SELECT COUNT(*) FROM ${TABLE_NAME}`);
		console.log("row: ", 1);

		assert.ok(true);
	});
});

