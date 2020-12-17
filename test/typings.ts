import DbRecord = require("../src/DbRecord");

class TestRecord extends DbRecord {
	static _table() {
		return "tests." + TABLE_NAME;
	}

	static _locatefield() {
		return "id";
	}

	static _keys() {
		return ["field2", "field2,field3", "name,field2,field3"];
	}

	myLocal() {}
}

// The 'item' type should resolve to "TestRecord" with TS
TestRecord.forEach({

}, async (item) => {
	item.myLocal();
})