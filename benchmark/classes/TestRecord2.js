"use strict";
const DbRecord2 = require('../../node_modules/advers-dbrecord2/lib/DbRecord2');

const TABLE_NAME = "dbrecord_test";


class TestRecord2 extends DbRecord2 {
	static _table() { return "tests." + TABLE_NAME; }
	static _locatefield() { return "id"; }
	static _keys() { return ["field2", "field2,field3", "name,field2,field3"]; }

	constructor(options = {}) {
		super(options);
	}
}

module.exports = TestRecord2;
