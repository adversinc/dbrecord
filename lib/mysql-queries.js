'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Future = require('fibers/future'),
    lodashMerge = require('lodash/merge'),
    mysql = require('mysql');

function querySync(query, values) {
	return dbh.querySync(query, values);
}

var _globalConfig = {};
var _globalDbh = null;

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
		this._config = lodashMerge({}, config);
		this._db = mysql.createConnection(this._config);
		this._transacted = 0;
		this._seq = Math.random();
	}

	_createClass(MysqlDatabase, [{
		key: 'connect',
		value: function connect(cb) {
			this._db.connect(cb);
		}
	}, {
		key: 'connectSync',
		value: function connectSync() {
			var future = new Future();
			this.connect(function (err) {
				if (err) {
					throw err;
				}

				future.return();
			});

			return future.wait();
		}
	}, {
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
	}, {
		key: 'query',
		value: function query(_query, values, cb) {
			return this._db.query(_query, values, cb);
		}
	}, {
		key: 'queryAsync',
		value: function queryAsync(query, values) {
			var _this = this;

			return new Promise(function (resolve, reject) {
				_this.query(query, values, function (err, res) {
					resolve(res);
				});
			});
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
		key: 'getRowSync',
		value: function getRowSync(query, values) {
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
   * @param {Function} cb - the callback to call. Should return 'false' if
   * 	transaction should be rolled back
   */

	}, {
		key: 'execTransaction',
		value: function execTransaction(cb) {
			// TODO GG: port the nested trasactions code here
			if (this._transacted == 0) {
				// Create another connection
				//const trxDb = new MysqlDatabase(mysql.createConnection(Meteor.settings.mysql));
				var _trxDb = this;

				_trxDb.querySync("START TRANSACTION  /* from trx */");
				_trxDb._transacted++;

				var res = false;
				try {
					res = cb(this);
				} catch (ex) {
					_trxDb.rollback();
					throw ex;
				}

				if (res === false) {
					_trxDb.rollback();
				} else {
					_trxDb.commit();
				}

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
				this.querySync("COMMIT /* from trx */");
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
				this.querySync("ROLLBACK /* from trx */");
			}
		}
	}, {
		key: 'destroy',
		value: function destroy() {
			this._db.destroy();
			this.removeHandlers();
		}

		/**
   * The connection configuration for globalDbh
   * @param config
   */

	}], [{
		key: 'globalConfig',
		value: function globalConfig(config) {
			_globalConfig = config;
		}

		/**
   * The connection factory. Creates a global connection to be used by default
   */

	}, {
		key: 'globalDbh',
		value: function globalDbh() {
			if (!_globalDbh) {
				_globalDbh = new MysqlDatabase(_globalConfig);
				_globalDbh.connectSync();
			}

			return _globalDbh;
		}
	}]);

	return MysqlDatabase;
}();

exports.default = MysqlDatabase;
//# sourceMappingURL=mysql-queries.js.map