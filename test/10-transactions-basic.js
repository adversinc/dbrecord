require('source-map-support').install();

process.env["NODE_CONFIG_DIR"] = __dirname + "/config/";
const
	assert = require('assert'),
	config = require("config"),
	Future = require('fibers/future'),
	Fiber = require('fibers'),
	lodashMerge = require('lodash/merge'),
	mlog = require('mocha-logger');

const time = require("./helpers/time");

// Libs to test
const MysqlDatabase = require("../lib/MysqlDatabase");
const TestRecord = require('./classes/TestRecord');

// Tests
describe('DbRecord transactions, single thread', function() {
	let dbh = null;
	before(function() {
		const c = lodashMerge({}, config.get("mysql"));
		c.reuseConnection = true;

		MysqlDatabase.masterConfig(c);
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
		//dbh._db.on('enqueue', function(sequence) {
		//	mlog.log("QUERY: ", sequence.sql);
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

		assert.ok(TestRecord.tryCreate({id: objId}) === null, "Object should not exist");
	});


	//
	//
	it('should intersect on single connection', function() {
		let rowsFound = null;

		// Start thread 2 which waits 500ms and then checks how many records there are
		// in a table. Should be 0 for a normal transaction, but we expect 1 here
		// since we share a single connection
		Future.task(function() {
			dbh.execTransaction((dbh) => {
				time.sleep(500);
				mlog.log("thread 2 starting");

				const res = dbh.getRowSync("SELECT COUNT(*) cnt FROM dbrecord_test");
				rowsFound = res.cnt;
				mlog.log("thread 2 res: ", res);

				mlog.log("thread 2 exiting");
			});
		}).detach();

		// Start thread 1 which will insert 1 record immediately and then sleep
		// for 1000ms
		dbh.execTransaction((dbh) => {
			mlog.log("thread 1 starting");
			dbh.querySync("INSERT INTO dbrecord_test SET name='thread 1'");
			time.sleep(1000);
			mlog.log("thread 1 exiting");
		});

		time.sleep(1000);
		mlog.log("tests completed");

		// Checks
		assert.equal(rowsFound, 1, "Found trx overlap");
	});
});

describe('DbRecord transactions, multi-thread', function() {
	let dbh = null;
	before(function() {
		const c = lodashMerge({}, config.get("mysql"));

		MysqlDatabase.masterConfig(c);
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
	it('should lock record with forUpdate', function() {
		let rowsFound = null;

		const obj = new TestRecord();
		obj.name("Original");
		obj.commit();

		res = dbh.getRowSync("SELECT id,name FROM dbrecord_test");
		mlog.log(`${obj._dbh._db.threadId}: dump: `, res.id, res.name);

		// Start thread 2 which waits 500ms which tries to read object #1
		let task2Val = "";
		Future.task(function() {
			dbh.execTransaction((dbh) => {
				time.sleep(500);
				mlog.log("thread 2 starting, dbh:", dbh._db.threadId);

				const res = dbh.getRowSync("SELECT id,name FROM dbrecord_test FOR UPDATE");
				task2Val = res.name;
				mlog.log("thread 2 res: ", res.id, res.name);

				mlog.log("thread 2 exiting");
			});
		}).detach();

		// Start thread 1 which will insert 1 record immediately and then sleep
		// for 1000ms
		dbh.execTransaction((dbh) => {
			mlog.log("thread 1 starting, dbh:", dbh._db.threadId);
			const obj = new TestRecord({ id: 1, forUpdate: true });
			mlog.log("thread 1 got obj and sleeping:", obj.id(), obj.name());

			time.sleep(1000);
			mlog.log("thread 1 updating data");
			obj.name("Changed");
			obj.commit();

			mlog.log("thread 1 exiting");
		});

		time.sleep(1000);
		mlog.log("tests completed");

		// Checks
		assert.strictEqual(task2Val, "Changed", "Thread 2 waited for FOR UPDATE");
	});


	//
	//
	it('should lock record with forUpdate in forEach', function() {
		let rowsFound = null;

		const obj = new TestRecord();
		obj.name("Original");
		obj.commit();

		res = dbh.getRowSync("SELECT id,name FROM dbrecord_test");
		mlog.log("dump: ", res.id, res.name);

		// Start thread 2 which waits 500ms which tries to read object #1
		let task2Val = "";
		Future.task(function() {
			dbh.execTransaction((dbh) => {
				time.sleep(1000);
				mlog.log("thread 2 starting, dbh:", dbh._db.threadId);

				const res = dbh.getRowSync("SELECT id,name FROM dbrecord_test FOR UPDATE");
				task2Val = res.name;
				mlog.log("thread 2 res: ", res.id, res.name);

				mlog.log("thread 2 exiting");
			});
		}).detach();

		// Start thread 1 which will insert 1 record immediately and then sleep
		// for 1000ms
		dbh.execTransaction((dbh) => {
			mlog.log("thread 1 starting, dbh:", dbh._db.threadId);
			TestRecord.forEach({ forUpdate: true }, (item, options) => {
				mlog.log(`${item._dbh._db.threadId}/${TestRecord.masterDbh()._db.threadId}: thread 1 locked record and sleeping:`, obj.id(), obj.name());
				time.sleep(2000);
				mlog.log("thread 1 sleep end");
				item.name("Changed by 1");
				mlog.log("thread 1 before commit");
				item.commit();
			});

			mlog.log("thread 1 exiting");
		});

		time.sleep(1000);
		mlog.log("tests completed");

		// Checks
		assert.strictEqual(task2Val, "Changed by 1", "Thread 2 waited for FOR UPDATE");
	});
});


// Tests
describe('DbRecord transactionWithMe', function() {
	let dbh = null;
	before(function() {
		const c = lodashMerge({}, config.get("mysql"));
		c.logger = mlog;

		MysqlDatabase.masterConfig(c);
		dbh = MysqlDatabase.masterDbh();
	});

	beforeEach(function() {
		TestRecord.createMockTable(dbh);
	});

	after(() => {
		MysqlDatabase.masterDbhDestroy();
	});

	//
	//
	it('should work inside trx', function() {
		const obj = new TestRecord();
		obj.name("Original name");
		obj.commit();

		let originalName = "was not called at all";

		obj.transactionWithMe((obj) => {
			//console.log("In TRX:", obj);
			originalName = obj.name();

			obj.name("Changed to new");
			obj.commit();
		});

		assert.equal(originalName, "Original name");
		assert.equal(obj.name(), "Changed to new");
	});

	it('should rollback trx if required', function() {
		const obj = new TestRecord();
		obj.name(this.test.fullTitle());
		obj.commit();

		let originalName = "was not called at all";

		obj.transactionWithMe((obj) => {
			console.log("In TRX:", obj.name());
			originalName = obj.name();

			obj.name("Changed to new");
			obj.commit();

			return false;
		});

		assert.equal(originalName, this.test.fullTitle());
		assert.equal(obj.name(), this.test.fullTitle());
	});


	it('ends and further queries work', function() {
		const obj = new TestRecord();
		obj.name(this.test.fullTitle());
		obj.commit();

		let originalName = "was not called at all";

		obj.transactionWithMe((obj) => {
			mlog.log(`${obj._dbh._db.threadId}: thread 1 starts, obj name: "${obj.name()}"`);
			originalName = obj.name();

			obj.name("Changed to new");
			obj.commit();

			mlog.log(`${obj._dbh._db.threadId}: thread 1 end`);
		});

		assert.doesNotThrow(() => {
			TestRecord.forEach({}, (item, options) => {
				console.log("item name:", item.name());
			});
		}, "forEach works after transactionWithMe");
	});
});
