"use strict";
const DbRecord = require('../../lib/DbRecord').DbRecord;

const TABLE_NAME = "dbrecord_test";

class TestRecord extends DbRecord {
	_table() { return "tests." + TABLE_NAME; }
	_locatefield() { return "id"; }

	/**
	 * Creates record instance
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
