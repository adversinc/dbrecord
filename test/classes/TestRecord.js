"use strict";
const DbRecord = require('../../lib/DbRecord');

const TABLE_NAME = "dbrecord_test";


class TestRecord extends DbRecord {
	static _table() { return "tests." + TABLE_NAME; }
	static _locatefield() { return "id"; }
	static _keys() { return ["field2", "field2,field3", "name,field2,field3"]; }

	/**
	 * Creates record instance
	 * TODO: Is this really required for overridden class?
	 */
	constructor(options = {}) {
		super(options);

		this._managedCalled = false;
	}

	managed_field(value) {
		console.log("managed_field called");

		this._managedCalled = true;
		return this._super.managed_field(value);
	}

	/**
	 * Create table for tests
	 * @param dbh
	 * @returns {Promise<void>}
	 */
	static async createMockTable(dbh) {
		dbh.querySync(`DROP TABLE IF EXISTS ${TABLE_NAME}`);
		dbh.querySync(`
			CREATE TABLE ${TABLE_NAME} (
				id int UNSIGNED NOT NULL AUTO_INCREMENT,
				name varchar(255) NULL,
				field2 int NULL,
				field3 varchar(255) DEFAULT NULL,
				managed_field varchar(255) DEFAULT NULL,
				unique_field varchar(255) DEFAULT NULL,
				
				PRIMARY KEY (id),
				UNIQUE KEY unique_field (unique_field)
			)
		`);
	}
}

module.exports = TestRecord;
