process.env["NODE_CONFIG_DIR"] = __dirname + "/config/";
const
	assert = require('assert'),
	config = require("config");

// Libs to test
const MysqlDatabase = require("../lib/MysqlDatabase");
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

	//
	//
	it('should use ORDERBY', function() {
		// Create records
		const source = [];
		for(let i = 0; i < 5; i++) {
			const obj = new TestRecord();
			obj.name(this.test.fullTitle() + "#" + i);
			obj.commit();
		}

		// Checks
		const res = [];
		TestRecord.forEach({ ORDERBY: "id DESC" }, (itm, options) => {
			res.push({ id: itm.id(), name: itm.name() });
		});

		assert.deepEqual(res, [
			{ id: 5, name: "DbRecord record iteration should use ORDERBY#4" },
			{ id: 4, name: "DbRecord record iteration should use ORDERBY#3" },
			{ id: 3, name: "DbRecord record iteration should use ORDERBY#2" },
			{ id: 2, name: "DbRecord record iteration should use ORDERBY#1" },
			{ id: 1, name: "DbRecord record iteration should use ORDERBY#0" },
		]);
	});

	//
	//
	it('should use limits', function() {
		// Create records
		const source = [];
		for(let i = 0; i < 5; i++) {
			const obj = new TestRecord();
			obj.name(this.test.fullTitle() + "#" + i);
			obj.commit();
		}

		// Checks
		const res = [];
		TestRecord.forEach({ LIMIT: 1 }, (itm, options) => {
			res.push({ id: itm.id(), name: itm.name() });
		});

		assert.deepEqual(res, [
			{ id: 1, name: "DbRecord record iteration should use limits#0" },
		]);
	});

	//
	//
	it('should use complex limits', function() {
		// Create records
		const source = [];
		for(let i = 0; i < 5; i++) {
			const obj = new TestRecord();
			obj.name(this.test.fullTitle() + "#" + i);
			obj.commit();
		}

		// Checks
		const res = [];
		TestRecord.forEach({ LIMIT: "2,1" }, (itm, options) => {
			res.push({ id: itm.id(), name: itm.name() });
		});

		assert.deepEqual(res, [
			{ id: 3, name: "DbRecord record iteration should use complex limits#2" },
		]);
	});

	//
	//
	it('should go through with field filter', function() {
		// Create records
		const source = [];
		for(let i = 0; i < 5; i++) {
			const obj = new TestRecord();
			obj.name(this.test.fullTitle() + "#" + i);
			obj.field2(i);
			obj.commit();
		}

		// Checks
		const res = [];
		TestRecord.forEach({ field2: 2, DEBUG_SQL_QUERY: 1 }, (itm, options) => {
			res.push({ id: itm.id(), name: itm.name(), field2: itm.field2() });
		});

		assert.deepEqual(res, [
			{ id: 3, name: "DbRecord record iteration should go through with field filter#2", field2: 2 },
		]);
	});



	it('should catch the iterator exception', function() {
		// Create records
		const source = [];
		for(let i = 0; i < 5; i++) {
			const obj = new TestRecord();

			obj.name(this.test.fullTitle() + "#" + i);
			obj.field2(i);
			obj.commit();
		}

		// Checks
		const ERROR = "Error in iterator";

		assert.throws(() => {
			TestRecord.forEach({
				field2: 2,
				DEBUG_SQL_QUERY: 1
			}, (itm, options) => {
				throw new Error(ERROR);
			});
		}, {
			message: ERROR
		});
	});


	it('should accept additional where conditions', function() {
		// Create records
		for(let i = 0; i < 10; i++) {
			const obj = new TestRecord();

			obj.name(this.test.fullTitle() + "#" + i);
			obj.field2(parseInt(i/3));
			obj.commit();
		}

		const n = TestRecord.forEach({
			whereCond: [ "field2=2" ]
		}, async (itm, options) => {
			assert.equal(itm.field2(), 2);
		});

		assert.equal(n, 3);
	});

	it('should accept additional where conditions with whereParam', function() {
		// Create records
		for(let i = 0; i < 10; i++) {
			const obj = new TestRecord();

			obj.name(this.test.fullTitle() + "#" + i);
			obj.field2(parseInt(i/3));
		}

		const n = TestRecord.forEach({
			whereCond: [ "field2=?" ],
			whereParam: [ 5 ]
		});

		assert.equal(n, 0);
	});

	it('should not clash on complex additional conditions', function() {
		// Create records
		for(let i = 0; i < 10; i++) {
			const obj = new TestRecord();

			obj.name(this.test.fullTitle() + "#" + i);
			obj.field2(parseInt(i/3));
		}

		const n = TestRecord.forEach({
			whereCond: [
				"field2=?",
				"field2=? OR field2=?"
			],
			whereParam: [ 1, 2, 3 ]
		});

		assert.equal(n, 0);
	});

});

