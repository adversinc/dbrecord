"use strict";
const DbRecord = require('../../lib/DbRecord').default;

const TABLE_NAME = "dbrecord_test";

class TestRecord extends DbRecord {
	static _table() { return "tests." + TABLE_NAME; }
	static _locatefield() { return "id"; }
	static _keys() { return ["field2"]; }

	/**
	 * Creates record instance
	 * TODO: Is this really required for overridden class?
	 */
	constructor(options = {}) {
		super(options);
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
				PRIMARY KEY (id)
			)
		`);
	}
}

module.exports = TestRecord;
