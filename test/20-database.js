process.env["NODE_CONFIG_DIR"] = __dirname + "/config/";
const
	assert = require('assert'),
	config = require("config"),
	Future = require("fibers/future");

// Libs to test
const MysqlDatabase = require("../lib/MysqlDatabase");
const TestRecord = require('./classes/TestRecord');

const TABLE_NAME = "dbrecord_test";

// Tests
describe('MysqlDatabase basic ops', function() {
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
	it('should fail on broken querySync', function() {
		assert.throws(() => {
			dbh.querySync(`SELECT_ZZZ * FROM ${TABLE_NAME}`);
		}, {
			errno: 1064
		});
	});

	//
	//
	it('should fail on broken queryAsync', function() {
		const future = new Future();

		let error = {};

		dbh.queryAsync(`SELECT_ZZZ * FROM ${TABLE_NAME}`)
			.then((res) => {
				future.return(true);
			})
			.catch((err) => {
				error = err;
				future.return(false);
			});

		const r = future.wait();
		assert.strictEqual(error.code,'ER_PARSE_ERROR');
		assert.strictEqual(error.errno, 1064);
	});

});

