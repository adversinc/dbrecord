require('source-map-support').install();

process.env["NODE_CONFIG_DIR"] = __dirname + "/config/";
const
	assert = require('assert'),
	config = require("config"),
	Future = require('fibers/future'),
	Fiber = require('fibers');

// Libs to test
const MysqlDatabase = require("../lib/mysql-queries").default;
const TestRecord = require('./classes/TestRecord');

// Tests
describe('DbRecord transactions', function() {
	let dbh = null;
	before(function() {
		MysqlDatabase.globalConfig(config.get("mysql"));
		dbh = MysqlDatabase.globalDbh();
	});
	beforeEach(() => {

	});

	//
	//
	it('should save committed', function() {
		TestRecord.createMockTable(dbh);

		var objId = null;
		dbh.execTransaction((dbh) => {
			const obj = new TestRecord();
			obj.name(this.test.fullTitle());
			obj.commit();

			objId = obj.id();
		});

		let exists = true;
		try {
			const obj2 = new TestRecord({id: objId});
		} catch(ex) {
			if(ex == "E_DB_NO_OBJECT") {
				exists = false;
			} else {
				throw ex;
			}
		}

		assert.ok(exists, "Object should exist");
	});

	//
	//
	it('should remove uncommitted', function() {
		//dbh._db.on('enqueue', function(sequence) {
		//	console.log("QUERY: ", sequence.sql);
		//});

		TestRecord.createMockTable(dbh);

		var objId = null;
		dbh.execTransaction((dbh) => {
			const obj = new TestRecord();
			obj.name(this.test.fullTitle());
			obj.commit();

			objId = obj.id();
			return false;
		});

		let notexists = false;
		try {
			const obj2 = new TestRecord({id: objId});
		} catch(ex) {
			if(ex == "E_DB_NO_OBJECT") {
				notexists = true;
			} else {
				throw ex;
			}
		}

		assert.ok(notexists, "Object should not exist");
	});


	//
	//
	it('should intersect on single dbh', function() {
		TestRecord.createMockTable(dbh);

		const sleep = function(ms) {
			var fiber = Fiber.current;
			setTimeout(function() {
				fiber.run();
			}, ms);
			Fiber.yield();
		};

		let rowsFound = null;

		// Start thread 2 which waits 500ms and then checks how many records there are
		// in a table. Should be 0 for a normal transaction, but we expect 1 here
		// since we share a single connection
		Future.task(function() {
			dbh.execTransaction((dbh) => {
				sleep(500);
				console.log("thread 2 starting");

				const res = dbh.getRowSync("SELECT COUNT(*) cnt FROM dbrecord_test");
				rowsFound = res.cnt;
				console.log("thread 2 res: ", res);

				console.log("thread 2 exiting");
			});
		}).detach();

		// Start thread 1 which will insert 1 record immediately and then sleep
		// for 1000ms
		dbh.execTransaction((dbh) => {
			console.log("thread 1 starting");
			dbh.querySync("INSERT INTO dbrecord_test SET name='thread 1'");
			sleep(1000);
			console.log("thread 1 exiting");
		});

		console.log("tests completed");

		// Checks
		assert.equal(rowsFound, 1, "Found trx overlap");
	});
});

