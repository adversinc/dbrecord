"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _future = _interopRequireDefault(require("fibers/future"));

var _MysqlDatabase = _interopRequireDefault(require("advers-dbrecord2/lib/MysqlDatabase2"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * The MySQL connection wrapper which provides the following features:
 * - "master" db connection factory function
 * - sync queries (using Future)
 * - async queries (using Promises - not tested yet)
 * - nested transactions support (in progress)
 * - connection pooling for transaction
 * - local context of "master" db connection inside the transaction
 *
 */

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
class MysqlDatabase extends _MysqlDatabase.default {
  /**
   * config:
   * 	user, password, host - regular mysql connection settings
   * 	reuseConnection - during a transaction start, don't get a new connection
   * 	debugSQL - log all SQL queries (debug)
   * @param config
   */
  constructor(config) {
    super(config);
  }

  connectSync() {
    const future = new _future.default();
    super.connect().then(() => {
      console.log(`${this._db.threadId}: mysql connected`);
      future.return();
    }).catch(err => {
      future.throw(err);
    });
    return future.wait();
  }
  /**
   * Runs a select query synchronously and returns the results
   * @param query - query to run
   * @param values - values to be passed to query
   */


  querySync(query, values) {
    const future = new _future.default(); // console.log("query", this._transacted?"(TRX)":"", query);

    this._db.query(query, values, (err, q) => {
      if (err) {
        //throw err;
        future.throw(err);
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


  getRowSync(query, values) {
    const rows = this.querySync(query, values); // It is questionable: should we return {} or null below? Which is easier to use?
    // {} seems to be safer to use, no null.field error will fire

    if (rows.length === 0) {
      return {};
    }

    return rows[0];
  }
  /**
   * @inheritDoc
   */


  execTransaction(cb) {
    // TODO GG: port the nested trasactions code here
    let trxDb = null;

    if (this._transacted > 0 || this._config.reuseConnection) {
      // In a nested transaction, don't create a new connection
      trxDb = this;
    } else {
      console.log(`Old ${this._db.threadId} is creating transaction connection`);
      trxDb = new MysqlDatabase(this._config);
      trxDb._transacted = this._transacted;
      trxDb.connectSync();
    } // Only execute START TRANSACTION for the first-level trx


    if (trxDb._transacted++ === 0) {
      trxDb.querySync("START TRANSACTION  /* from trx */");
    } // console.log("before context");
    // Execute transaction and create a running context for it


    trxContext.run(() => {
      trxContext.set("dbh", trxDb);
      let res = false;

      try {
        res = cb(trxDb);
      } catch (ex) {
        trxDb.rollback();
        throw ex;
      }

      if (res === false) {
        trxDb.rollback();
      } else {
        trxDb.commit();
      }
    }); // If we created a new connection, destroy it

    if (trxDb != this) {
      console.log(`${trxDb._db.threadId}: destroying trxDb`);
      trxDb.destroy();
    }

    return trxDb;
  }
  /**
   * @inheritDoc
   */


  commit() {
    const future = new _future.default();
    super.commit().then(res => future.return(res)).catch(err => {
      future.throw(err);
    });
    return future.wait();
  }
  /**
   * @inheritDoc
   */


  rollback() {
    const future = new _future.default();
    super.rollback().then(res => future.return(res)).catch(err => {
      future.throw(err);
    });
    return future.wait();
  }
  /**
   * @inheritDoc
   */


  static masterDbh() {
    const future = new _future.default();
    super.masterDbh().then(res => future.return(res)).catch(err => {
      future.throw(err);
    });
    return future.wait();
  }

}

var _default = MysqlDatabase;
exports.default = _default;
module.exports = exports.default;