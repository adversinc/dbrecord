import {describe, before, after, beforeEach, it} from "mocha";

import TestRecordTS from "./classes/TestRecordTS";
import DbRecord from "../src/DbRecord";

process.env["NODE_CONFIG_DIR"] = __dirname + "/config/";
const
	assert = require('assert'),
	config = require("config");

// Libs to test
import MysqlDatabase from "../lib/MysqlDatabase";

// Tests
describe('[TS] DbRecord basic ops', function() {
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
		TestRecordTS.createMockTable(dbh);
	});


	it("[TS] should return correct master dbh", function() {
		const dbh2 = TestRecordTS.masterDbh();

		assert.ok(dbh2.cid, "Database handle exists");
		assert.equal(dbh2.cid, dbh.cid, "Database handle is correct");
	});

	//
	//
	it('[TS] should create a row', function() {
		const obj = new TestRecordTS();
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
	it('[TS] should create a row with predefined locate id', function() {
		const id = Math.round(10 + Math.random()*1000);

		const obj = new TestRecordTS();
		obj.id(id);
		obj.name(this.test.fullTitle());
		obj.commit();

		obj.managed_field(`with ${id}`);
		obj.commit();

		// Checks
		const TABLE_NAME  = obj._tableName;
		const row = dbh.querySync(`SELECT * FROM ${TABLE_NAME}`);

		assert.deepEqual(row, [ {
			id: id,
			name: this.test.fullTitle(),
			field2: null,
			field3: null,
			managed_field: `with ${id}`,
			unique_field: null,
		} ]);
	});

	//
	//
	it('[TS] should create using newRecord', function() {
		const obj = TestRecordTS.newRecord({
			name: this.test.fullTitle(),
			field2: 123,
			field3: 456
		});

		// Checks
		// @ts-ignore
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
	it('[TS] should create use newRecord options', function() {
		const obj = TestRecordTS.newRecord({
			name: this.test.fullTitle(),
			field2: 123,
			field3: 456
		}, { noCommit: true });

		// @ts-ignore
		const TABLE_NAME  = obj._tableName;

		// Checks 1
		const row = dbh.querySync(`SELECT * FROM ${TABLE_NAME}`);
		assert.deepEqual(row, [ ]);

		obj.commit();

		// Checks 2
		const row2 = dbh.querySync(`SELECT * FROM ${TABLE_NAME}`);
		assert.deepEqual(row2, [ {
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
	it('[TS] should create using newRecord with id', function() {
		const obj = TestRecordTS.newRecord({
			id: 999,
			name: this.test.fullTitle(),
			field2: 123,
			field3: 456
		});

		// Checks
		// @ts-ignore
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
	it('[TS] should fail on a row duplicate', function() {
		const obj1 = new TestRecordTS();
		obj1.name(this.test.fullTitle());
		obj1.unique_field("1");
		obj1.commit();

		assert.throws(() => {
			const obj2 = new TestRecordTS();
			obj2.name(this.test.fullTitle());
			obj2.unique_field("1");
			obj2.commit();
		}, {
			sqlMessage: "Duplicate entry '1' for key 'dbrecord_test.unique_field'"
		});
	});

	//
	//
	it('[TS] should fail on unexistent row', function() {
		let error: Partial<Error> = {};
		try {
			let obj = new TestRecordTS({id: 1});
			console.log("obj:", obj);
		} catch(ex) {
			error = ex;
		}

		assert.equal(error.message, "E_DB_NO_OBJECT");
	});

	//
	//
	it('[TS] should get created on existing row', function() {
		dbh.querySync(`INSERT INTO dbrecord_test SET id=10,name=?`, [this.test.fullTitle()]);

		const obj = new TestRecordTS({ id: 10 });

		assert.equal(obj.name(), this.test.fullTitle());
	});

	//
	//
	it('[TS] should get created by secondary key', function() {
		dbh.querySync(`INSERT INTO dbrecord_test SET name=?, field2=?`, [ Math.random(), 100 ]);
		dbh.querySync(`INSERT INTO dbrecord_test SET name=?, field2=?`, [this.test.fullTitle(), 200]);
		dbh.querySync(`INSERT INTO dbrecord_test SET name=?, field2=?`, [ Math.random(), 300 ]);

		const obj = new TestRecordTS({ field2: 200 });

		assert.deepEqual(
			{ name: obj.name(), field2: obj.field2() },
			{ name: this.test.fullTitle(), field2: 200 }
		);
	});

	//
	//
	it('[TS] should fail by unexisting secondary key', function() {
		dbh.querySync(`INSERT INTO dbrecord_test SET name=?, field2=?`, [ Math.random(), 100 ]);
		dbh.querySync(`INSERT INTO dbrecord_test SET name=?, field2=?`, [this.test.fullTitle(), 200]);
		dbh.querySync(`INSERT INTO dbrecord_test SET name=?, field2=?`, [ Math.random(), 300 ]);

		let error: Partial<Error> = {};
		try {
			let obj = new TestRecordTS({ field2: 10000 });
		} catch(ex) {
			error = ex;
		}

		assert.equal(error.message, "E_DB_NO_OBJECT");
	});

	//
	//
	it('[TS] should get created by complex secondary key', function() {
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

		const obj = new TestRecordTS({ field2: 200, field3: "Third" });

		assert.deepEqual(
			{ name: obj.name(), field2: obj.field2(), field3: obj.field3() },
			{ name: this.test.fullTitle(), field2: 200, field3: "Third" }
		);
	});

	//
	//
	it('[TS] should fail by unexisting complex secondary key', function() {
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

		let error: Partial<Error> = {};
		try {
			let obj = new TestRecordTS({ field2: 200, field3: "One hundreds" });
		} catch(ex) {
			error = ex;
		}

		assert.equal(error.message, "E_DB_NO_OBJECT");
	});

	//
	//
	it('[TS] should create in tryCreate', function() {
		dbh.querySync(`INSERT INTO dbrecord_test SET id=3,name=?`, [this.test.fullTitle()]);

		let obj = TestRecordTS.tryCreate({ id: 3 });

		assert.ok(obj !== null);
		assert.equal(obj.name(), this.test.fullTitle());
	});

	//
	//
	it('[TS] should fail in tryCreate for nonexistant', function() {
		dbh.querySync(`INSERT INTO dbrecord_test SET id=3,name=?`, [this.test.fullTitle()]);

		let obj = TestRecordTS.tryCreate({ id: 3000 });

		assert.ok(obj === null);
	});

	//
	//
	it('[TS] should remove itself', function() {
		dbh.querySync(`INSERT INTO dbrecord_test SET id=3,name=?`, [this.test.fullTitle()]);

		let obj = TestRecordTS.tryCreate({ id: 3 });
		assert.ok(obj !== null);

		obj.deleteRecord();

		let obj2 = TestRecordTS.tryCreate({ id: 3 });
		assert.ok(obj2 === null);
	});

	//
	//
	it('[TS] should create subclass using tryCreate', function() {

		class DerivedClassDB extends TestRecordTS {
			name: DbRecord.Column.String;

			constructor(values = {}, options = {}) {
				super(values, options);

				console.log("DerivedClassDB constructor called")
			}

			//static tryCreate() {}
		}

		class DerivedClass extends DerivedClassDB {
			constructor(values = {}, options = {}) {
				super(values, options);
			}
		}


		dbh.querySync(`INSERT INTO dbrecord_test SET id=3,name=?`, [this.test.fullTitle()]);

		let obj = DerivedClass.tryCreate({ id: 3 });
		let newDerived = new DerivedClass();

		//console.log(Object.getPrototypeOf(obj));
		//console.log(Object.getPrototypeOf(newDerived));

		console.log("obj id:", obj.id(), obj.name);

		assert.ok(obj !== null);
		assert.equal(obj.name(), this.test.fullTitle());
		assert.equal(obj.constructor.name, "DerivedClass");
		assert.deepEqual(
			[
				//@ts-ignore
				obj.__proto__.constructor.name,
				//@ts-ignore
				obj.__proto__.__proto__.constructor.name,
				//@ts-ignore
				obj.__proto__.__proto__.__proto__.constructor.name,
				//@ts-ignore
				obj.__proto__.__proto__.__proto__.__proto__.constructor.name,
				//@ts-ignore
				obj.__proto__.__proto__.__proto__.__proto__.__proto__.constructor.name],
			[
				"DerivedClass", "DerivedClassDB",
				"TestRecord", "TestRecordDB",
				"DbRecord"]
		);
	});

});

