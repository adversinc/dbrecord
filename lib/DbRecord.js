"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _future = _interopRequireDefault(require("fibers/future"));

var _adversDbrecord = _interopRequireDefault(require("advers-dbrecord2"));

var _MysqlDatabase = _interopRequireDefault(require("./MysqlDatabase"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Represents the database record class.
**/
class DbRecord extends _adversDbrecord.default {
  /**
   * Creates the class instance. If options.${_locatefield()} parameter is specified,
   * reads the data from the database and put them into the internal structures
   * (see _init() and _read())
   * @param {Object} [options]
   * @param {Boolean} [options.forUpdate] - read record with FOR UPDATE flag,
   * 	blocking it within the transaction
   */
  constructor(options = {}) {
    super(options);
    const future = new _future.default();
    super.init().then(res => future.return(res)).catch(err => {
      future.throw(err);
    });
    return future.wait();
  }

  init() {} // Empty here, DbRecord does not need init

  /**
   * Tries creating an object by locate field/keys. Unlike constructor, does
   * not throw an error for non-existing record and returns null instead.
   * @param options
   */


  static tryCreate(options = {}) {
    try {
      return new this(options);
    } catch (ex) {
      if (ex.message == "E_DB_NO_OBJECT") {
        return null;
      } else {
        throw ex;
      }
    }
  }
  /** Creates a new database record, populating it from the fields list
   * @param {Object} fields
   * @param {Object} [options] - options for database creation
   * @returns {DbRecord} the newly created object
   */


  static newRecord(fields, options = {}) {
    const obj = new this();
    Object.keys(fields).forEach(k => {
      obj._changes[k] = true;
      obj._raw[k] = fields[k];
    });
    obj.commit();
    return obj;
  }
  /**
   * Instructs class to either save changes to db after each field update, or
   * accumulate the changes.
   * @param {boolean} auto
   */


  autocommit(auto) {
    if (auto && !this._autocommit) {
      // If there are potential unsaved changes, save them
      this.commit();
    }

    this._autocommit = auto;
  }
  /**
   * Save accumulated changed fields, if any
   */


  commit() {
    const future = new _future.default();
    super.commit().then(res => future.return(res)).catch(err => {
      future.throw(err);
    });
    return future.wait();
  }
  /**
   * Removes the record from the database. No verification or integrity checks
   * are being performed, they are up to caller.
   */


  deleteRecord() {
    const future = new _future.default();
    super.deleteRecord().then(res => future.return(res)).catch(err => {
      future.throw(err);
    });
    return future.wait();
  }
  /**
   * @inheritDoc
   */


  static forEach(options, cb) {
    const where = [];
    const qparam = [];

    const sql = this._prepareForEach(options, where, qparam); //
    // Iterate


    const _dbh = this._getDbhClassStatic().masterDbh();

    console.log(`${_dbh._db.threadId}: will be running forEach query`);

    const rows = _dbh.querySync(sql, qparam);

    options.TOTAL = rows.length;

    if (cb) {
      options.COUNTER = 0;

      for (const row of rows) {
        options.COUNTER++;
        const o = {};
        o[this._locatefield()] = row[this._locatefield()];
        const obj = new this(o); // Wait for iterator to end

        cb(obj, options);
      }
    } else {
      options.COUNTER = options.TOTAL;
    }

    return options.COUNTER;
  }

  static _getDbhClassStatic() {
    return _MysqlDatabase.default;
  }

  _getDbhClass() {
    return _MysqlDatabase.default;
  } // Helper functions

  /**
   * Add value to mysql SET field
   * @param currentValue
   * @param newValue
   */


  static setFieldSet(currentValue, newValue) {
    const parts = typeof currentValue === "string" && currentValue !== "" ? currentValue.split(",") : [];
    parts.push(newValue);
    return parts.join(",");
  }
  /**
   * Remove value from mysql SET field
   * @param currentValue
   * @param toRemove
   */


  static setFieldRemove(currentValue, toRemove) {
    let parts = typeof currentValue === "string" ? currentValue.split(",") : [];
    parts = parts.filter(v => v !== toRemove);
    return parts.join(",");
  }
  /**
   * Check if value in in mysql SET field
   * @param currentValue
   * @param toRemove
   */


  static setFieldCheck(currentValue, check) {
    const parts = typeof currentValue === "string" ? currentValue.split(",") : [];
    return parts.includes(check);
  }
  /**
   * @inheritDoc
   */


  transactionWithMe(cb) {
    const future = new _future.default();
    super.transactionWithMe(cb).then(res => future.return(res)).catch(err => {
      future.throw(err);
    });
    return future.wait();
  }

  static _getDbhClass() {
    return _MysqlDatabase.default;
  }

}
/**
 * The sorting function to get entries with more commas first
 * @param a
 * @param b
 */


exports.default = DbRecord;

function commaSort(a, b) {
  const ca = strcount(a, ",");
  const cb = strcount(b, ",");
  return ca > cb ? -1 : 1;
}

module.exports = exports.default;