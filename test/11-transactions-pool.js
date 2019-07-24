require('source-map-support').install();

process.env["NODE_CONFIG_DIR"] = __dirname + "/config/";
const
	assert = require('assert'),
	config = require("config"),
	Future = require('fibers/future'),
	Fiber = require('fibers'),
	lodashMerge = require('lodash/merge'),
	mlog = require('mocha-logger');

// Libs to test
const MysqlDatabase = require("../lib/MysqlDatabase");
const TestRecord = require('./classes/TestRecord');

// Tests
describe('DbRecord transactions pool', function() {
	let dbh = null;

	before(function() {
		const c = lodashMerge({}, config.get("mysql"));
		// Should be at least 3: one main connection, and 1 for each thread in test
		if(c.connectionLimit < 3) {
			mlog.log("c.connectionLimit increased to 3");
			c.connectionLimit = 3;
		}

		MysqlDatabase.setupPool(c);
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
		var objId = null;
		dbh.execTransaction((dbh) => {
			const obj = new TestRecord();
			obj.name(this.test.fullTitle());
			obj.commit();

			objId = obj.id();
			return false;
		});

		assert.ok(TestRecord.tryCreate({ id: objId }) === null, "Object should not exist");
	});


	//
	//
	it('should not intersect', function() {
		const sleep = function(ms) {
			var fiber = Fiber.current;
			setTimeout(function() {
				fiber.run();
			}, ms);
			Fiber.yield();
		};

		let rowsFound = null;

		dbh.querySync("INSERT INTO dbrecord_test SET name=?", [ 'main thread' ]);

		// Start thread 2 which waits 500ms. Then checks how many records there are
		// in a table. Should be 1 if transaction separation works.
		Future.task(function() {
			dbh.execTransaction((dbh) => {
				sleep(500);
				mlog.log("thread 2 starting");

				const res = dbh.getRowSync("SELECT COUNT(*) cnt FROM dbrecord_test");
				rowsFound = res.cnt;
				mlog.log("thread 2 rows found: ", rowsFound.cnt);

				mlog.log("thread 2 exiting");
			});
		}).detach();

		// Start thread 1 which will insert 1 record immediately and then sleep
		// for 1000ms
		dbh.execTransaction((dbh) => {
			mlog.log("thread 1 starting");
			dbh.querySync("INSERT INTO dbrecord_test SET name=?, field2=?",
				[ 'thread 1 ', Math.random()*1000000 ]);

			mlog.log("thread 1 has added a 2nd record");
			sleep(1000);
			mlog.log("thread 1 exiting");
		});

		sleep(1000);

		// Checks
		assert.equal(rowsFound, 1, "No trx overlap found");
	});
});

