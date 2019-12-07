const
	Benchmark = require('benchmark'),
	config = require("config"),
	Future = require("fibers/future");

const suite = new Benchmark.Suite;

// libs
const MysqlDatabase = require("../lib/MysqlDatabase");
const TestRecord = require('../test/classes/TestRecord');
const TestRecord2 = require('./classes/TestRecord2');


// add tests
Future.task(() => {
	MysqlDatabase.masterConfig(config.get("mysql"));
	const dbh = MysqlDatabase.masterDbh();

	TestRecord.createMockTable(dbh);

	let sql = "INSERT INTO dbrecord_test(name,unique_field) VALUES";
	const values = [];
	for(let i=0; i<100; i++) {
		values.push(`("${i}", ${i})`);
	}
	dbh.querySync(sql + values.join(","));

	suite
		.on('error', function(event) {
			console.error(event.target.error);
		})

		.add('forEach2', function() {
			Future.fromPromise(
				TestRecord2.forEach({}, async(item, options) => {})
			).wait();
		})
		.add('forEach', function() {
			TestRecord.forEach({}, (item, options) => {
			});
		})

		// add listeners
		.on('cycle', function(event) {
			console.log(String(event.target));
		})
		.on('complete', function() {
			console.log('Fastest is ' + this.filter('fastest').map('name'));
		})
		// run
		.run();
}).detach();
