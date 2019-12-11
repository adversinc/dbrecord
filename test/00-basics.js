process.env["NODE_CONFIG_DIR"] = __dirname + "/config/";
const
	assert = require('assert'),
	config = require("config");

// Libs to test
const MysqlDatabase = require("../lib/MysqlDatabase");
const TestRecord = require('./classes/TestRecord');

// Tests
describe('DbRecord basic ops', function() {
	let dbh = null;
	before(function() {
		MysqlDatabase.masterConfig(config.get("mysql"));

		dbh = MysqlDatabase.masterDbh();
		console.log("dbh class:", dbh.constructor.name);
	});
	after(() => {
		MysqlDatabase.masterDbhDestroy();
	});

	beforeEach(() => {
		TestRecord.createMockTable(dbh);
	});

	//
	//
	it('should create a row', function() {
		const obj = new TestRecord();
		obj.name(this.test.fullTitle());
		obj.commit();

		// Checks
		const TABLE_NAME  = obj._tableName;
		const row = dbh.querySync(`SELECT * FROM ${TABLE_NAME}`);
		assert.deepEqual(row, [ {
			id: 1,
			name: this.test.fullTitle(),
			field2: null,
			field3: null,
			managed_field: null,
			unique_field: null
		} ]);
	});

	//
	//
	it('should create using newRecord', function() {
		const obj = TestRecord.newRecord({
			name: this.test.fullTitle(),
			field2: 123,
			field3: 456
		});

		// Checks
		const TABLE_NAME  = obj._tableName;
		const row = dbh.querySync(`SELECT * FROM ${TABLE_NAME}`);
		assert.deepEqual(row, [ {
			id: 1,
			name: this.test.fullTitle(),
			field2: 123,
			field3: 456,
			managed_field: null,
			unique_field: null
		} ]);
	});
	//
	//
	it('should create using newRecord with id', function() {
		const obj = TestRecord.newRecord({
			id: 999,
			name: this.test.fullTitle(),
			field2: 123,
			field3: 456
		});

		// Checks
		const TABLE_NAME  = obj._tableName;
		const row = dbh.querySync(`SELECT * FROM ${TABLE_NAME}`);
		assert.deepEqual(row, [ {
			id: 999,
			name: this.test.fullTitle(),
			field2: 123,
			field3: 456,
			managed_field: null,
			unique_field: null
		} ]);
	});

	//
	//
	it('should fail on a row duplicate', function() {
		const obj1 = new TestRecord();
		obj1.name(this.test.fullTitle());
		obj1.unique_field("1");
		obj1.commit();

		assert.throws(() => {
			const obj2 = new TestRecord();
			obj2.name(this.test.fullTitle());
			obj2.unique_field("1");
			obj2.commit();
		}, {
			sqlMessage: "Duplicate entry '1' for key 'unique_field'"
		});
	});

	//
	//
	it('should fail on unexistent row', function() {
		let error = {};
		try {
			let obj = new TestRecord({id: 1});
			console.log("obj:", obj);
		} catch(ex) {
			error = ex;
		}

		assert.equal(error.message, "E_DB_NO_OBJECT");
	});

	//
	//
	it('should get created on existing row', function() {
		dbh.querySync(`INSERT INTO dbrecord_test SET id=10,name=?`, [this.test.fullTitle()]);

		const obj = new TestRecord({ id: 10 });

		assert.equal(obj.name(), this.test.fullTitle());
	});

	//
	//
	it('should get created by secondary key', function() {
		dbh.querySync(`INSERT INTO dbrecord_test SET name=?, field2=?`, [ Math.random(), 100 ]);
		dbh.querySync(`INSERT INTO dbrecord_test SET name=?, field2=?`, [this.test.fullTitle(), 200]);
		dbh.querySync(`INSERT INTO dbrecord_test SET name=?, field2=?`, [ Math.random(), 300 ]);

		const obj = new TestRecord({ field2: 200 });

		assert.deepEqual(
			{ name: obj.name(), field2: obj.field2() },
			{ name: this.test.fullTitle(), field2: 200 }
		);
	});

	//
	//
	it('should fail by unexisting secondary key', function() {
		dbh.querySync(`INSERT INTO dbrecord_test SET name=?, field2=?`, [ Math.random(), 100 ]);
		dbh.querySync(`INSERT INTO dbrecord_test SET name=?, field2=?`, [this.test.fullTitle(), 200]);
		dbh.querySync(`INSERT INTO dbrecord_test SET name=?, field2=?`, [ Math.random(), 300 ]);

		let error = {};
		try {
			let obj = new TestRecord({ field2: 10000 });
		} catch(ex) {
			error = ex;
		}

		assert.equal(error.message, "E_DB_NO_OBJECT");
	});

	//
	//
	it('should get created by complex secondary key', function() {
		// IMPORTANT: the test relies on a row insertion order (the row inserted
		// first is supposed to be returned with LIMIT 1
		dbh.querySync(`INSERT INTO dbrecord_test SET name=?, field2=?, field3=?`,
			[ Math.random(), 100, "First" ]);
		dbh.querySync(`INSERT INTO dbrecord_test SET name=?, field2=?, field3=?`,
			[this.test.fullTitle(), 200, "Second"]);
		dbh.querySync(`INSERT INTO dbrecord_test SET name=?, field2=?, field3=?`,
			[this.test.fullTitle(), 200, "Third"]);
		dbh.querySync(`INSERT INTO dbrecord_test SET name=?, field2=?, field3=?`,
			[ Math.random(), 300, "Fourth" ]);

		const obj = new TestRecord({ field2: 200, field3: "Third" });

		assert.deepEqual(
			{ name: obj.name(), field2: obj.field2(), field3: obj.field3() },
			{ name: this.test.fullTitle(), field2: 200, field3: "Third" }
		);
	});

	//
	//
	it('should fail by unexisting complex secondary key', function() {
		// IMPORTANT: the test relies on a row insertion order (the row inserted
		// first is supposed to be returned with LIMIT 1
		dbh.querySync(`INSERT INTO dbrecord_test SET name=?, field2=?, field3=?`,
			[ Math.random(), 100, "First" ]);
		dbh.querySync(`INSERT INTO dbrecord_test SET name=?, field2=?, field3=?`,
			[this.test.fullTitle(), 200, "Second"]);
		dbh.querySync(`INSERT INTO dbrecord_test SET name=?, field2=?, field3=?`,
			[this.test.fullTitle(), 200, "Third"]);
		dbh.querySync(`INSERT INTO dbrecord_test SET name=?, field2=?, field3=?`,
			[ Math.random(), 300, "Fourth" ]);

		let error = {};
		try {
			let obj = new TestRecord({ field2: 200, field3: "One hundreds" });
		} catch(ex) {
			error = ex;
		}

		assert.equal(error.message, "E_DB_NO_OBJECT");
	});

	//
	//
	it('should create in tryCreate', function() {
		dbh.querySync(`INSERT INTO dbrecord_test SET id=3,name=?`, [this.test.fullTitle()]);

		let obj = TestRecord.tryCreate({ id: 3 });

		assert.ok(obj !== null);
		assert.equal(obj.name(), this.test.fullTitle());
	});

	//
	//
	it('should fail in tryCreate for nonexistant', function() {
		dbh.querySync(`INSERT INTO dbrecord_test SET id=3,name=?`, [this.test.fullTitle()]);

		let obj = TestRecord.tryCreate({ id: 3000 });

		assert.ok(obj === null);
	});

	//
	//
	it('should remove itself', function() {
		dbh.querySync(`INSERT INTO dbrecord_test SET id=3,name=?`, [this.test.fullTitle()]);

		let obj = TestRecord.tryCreate({ id: 3 });
		assert.ok(obj !== null);

		obj.deleteRecord();

		let obj2 = TestRecord.tryCreate({ id: 3 });
		assert.ok(obj2 === null);
	});
});

