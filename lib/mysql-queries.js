'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Future = require('fibers/future'),
    mysql = require('mysql');

function querySync(query, values) {
	return dbh.querySync(query, values);
}

/**
 * The database processing class.
 *
 * Transaction processing
 *
 * The problem is that all queries share the same mysql connection. Thus, even
 * if we have started the transaction, other queries can intervene within it.
 *
 * To avoid this, we create a separate connection when calling code starts
 * transaction. Then we return the new database handle ("transacted") to use,
 * and commit/rollback at the end.
 *
 * var dbh = dbh.beginTransaction(); // new dbh is created here
 * ....
 * dbh.commit();
 */

var MysqlDatabase = function () {
	function MysqlDatabase(config) {
		_classCallCheck(this, MysqlDatabase);

		//console.log("created MysqlDatabase:", db);
		this._db = mysql.createConnection(config);
		this._transacted = 0;
	}

	_createClass(MysqlDatabase, [{
		key: 'disconnect',
		value: function disconnect() {
			this._db.end();
		}
	}, {
		key: 'closeAndExit',
		value: function closeAndExit() {
			trxDb.destroy();
			setTimeout(function () {
				process.exit();
			}, 500);
		}

		/**
   * Runs a select query synchronously and returns the results
   * @param query - query to run
   * @param values - values to be passed to query
   */

	}, {
		key: 'querySync',
		value: function querySync(query, values) {
			var future = new Future();

			// console.log("query", this._transacted?"(TRX)":"", query);

			this._db.query(query, values, function (err, q) {
				if (err) {
					throw err;
					future.return(err);
				} else {
					future.return(q);
				}
			});

			return future.wait();
		}

		/**
   * A shortcut function to get a single rows without messing with row arrays
   *
   * @param query
   * @param values
   * @returns {Object} - the object with selected fields or {} of no rows found
   */

	}, {
		key: 'querySingleSync',
		value: function querySingleSync(query, values) {
			var rows = this.querySync(query, values);
			// It is questionable: should we return {} or null below? Which is easier to use?
			// {} seems to be safer to use, no null.field error will fire
			if (rows.length === 0) {
				return {};
			}

			return rows[0];
		}

		/**
   * Begins the database transaction
   */

	}, {
		key: 'beginTransaction',
		value: function beginTransaction() {
			// TODO GG: port the nested trasactions code here
			if (this._transacted == 0) {
				// Create another connection
				var _trxDb = new MysqlDatabase(mysql.createConnection(Meteor.settings.mysql));

				_trxDb.querySync("BEGIN");
				_trxDb._transacted++;

				// Close connections on hot code push
				process.on('SIGTERM', this.closeAndExit);
				// Close connections on exit (ctrl + c)
				process.on('SIGINT', this.closeAndExit);

				return _trxDb;
			}
		}

		/**
   * Commits the current database transaction
   */

	}, {
		key: 'commit',
		value: function commit() {
			if (this._transacted > 0) {
				this._transacted--;
				this.querySync("COMMIT");
				this._db.destroy();

				this.removeHandlers();
			}
		}

		/**
   * Rolls back the current database transaction
   */

	}, {
		key: 'rollback',
		value: function rollback() {
			if (this._transacted > 0) {
				this._transacted--;
				this.querySync("ROLLBACK");
				this._db.destroy();

				this.removeHandlers();
			}
		}
	}, {
		key: 'destroy',
		value: function destroy() {
			this._db.destroy();
			this.removeHandlers();
		}
	}, {
		key: 'removeHandlers',
		value: function removeHandlers() {
			process.removeListener('SIGTERM', this.closeAndExit);
			process.removeListener('SIGINT', this.closeAndExit);
		}
	}]);

	return MysqlDatabase;
}();

exports.default = MysqlDatabase;