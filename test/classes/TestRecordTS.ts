import DbRecord from "../../src/DbRecord";

const TABLE_NAME = "dbrecord_test";

class TestRecordDB extends DbRecord {
	id!: DbRecord.Column.Number;
	name!: DbRecord.Column.String;
	unique_field!: DbRecord.Column.String;
	field2!: DbRecord.Column.String;
	field3!: DbRecord.Column.String;

	declare _tableName: string;
}

class TestRecord extends TestRecordDB {
	static _table() { return "tests." + TABLE_NAME; }
	static _locatefield() { return "id"; }
	static _keys() { return ["field2", "field2,field3", "name,field2,field3"]; }

	_managedCalled: boolean = false;

	/**
	 * Creates record instance
	 * TODO: Is this really required for overridden class?
	 */
	constructor(values = {}, initOptions = {}) {
		super(values, initOptions);
	}

	managed_field(value) {
		console.log("managed_field called");

		this._managedCalled = true;

		const _super = this._super as TestRecord;
		return _super.managed_field(value);
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

export default TestRecord;
