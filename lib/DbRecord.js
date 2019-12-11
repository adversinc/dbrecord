"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _fibers = _interopRequireDefault(require("fibers"));

var _future = _interopRequireDefault(require("fibers/future"));

var _adversDbrecord = _interopRequireDefault(require("advers-dbrecord2"));

var _MysqlDatabase = _interopRequireDefault(require("./MysqlDatabase"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Represents the database record class.
**/
class DbRecord extends _adversDbrecord.default {
  /**
   * @inheritdoc
   */
  constructor(options = {}) {
    super(options);
    const future = new _future.default();
    super.init().then(res => future.return(res)).catch(err => {
      future.throw(err);
    });
    return future.wait();
  }

  init() {// Empty here, DbRecord does not need init
  }

  static _getDbhClass() {
    return _MysqlDatabase.default;
  }
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
    const future = new _future.default();
    super.newRecord(fields, options).then(res => future.return(res)).catch(err => {
      future.throw(err);
    });
    return future.wait();
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


  commit(options = {}) {
    // If called without a fiber, fall to super
    if (_fibers.default.current === undefined) {
      return super.commit(options);
    }

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
   * @inheritdoc
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
   * @inheritdoc
   */


  transactionWithMe(cb) {
    const Class = this.constructor; // Make sure we are committed

    if (Object.keys(this._changes).length > 0) {
      throw new Error(`${Class.name}: Object has uncommitted changes before transaction`);
    }

    const dbh = Class.masterDbh();
    dbh.execTransaction(() => {
      const params = {};
      params[this._locateField] = this[this._locateField]();
      const me = new this.constructor(params);
      return cb(me);
    }); // Re-read our object after the transaction

    _future.default.fromPromise(this._read(this[this._locateField]())).wait();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9EYlJlY29yZC5qcyJdLCJuYW1lcyI6WyJEYlJlY29yZCIsIkRiUmVjb3JkMiIsImNvbnN0cnVjdG9yIiwib3B0aW9ucyIsImZ1dHVyZSIsIkZ1dHVyZSIsImluaXQiLCJ0aGVuIiwicmVzIiwicmV0dXJuIiwiY2F0Y2giLCJlcnIiLCJ0aHJvdyIsIndhaXQiLCJfZ2V0RGJoQ2xhc3MiLCJNeXNxbERhdGFiYXNlIiwidHJ5Q3JlYXRlIiwiZXgiLCJtZXNzYWdlIiwibmV3UmVjb3JkIiwiZmllbGRzIiwiYXV0b2NvbW1pdCIsImF1dG8iLCJfYXV0b2NvbW1pdCIsImNvbW1pdCIsIkZpYmVyIiwiY3VycmVudCIsInVuZGVmaW5lZCIsImRlbGV0ZVJlY29yZCIsImZvckVhY2giLCJjYiIsIndoZXJlIiwicXBhcmFtIiwic3FsIiwiX3ByZXBhcmVGb3JFYWNoIiwiX2RiaCIsIl9nZXREYmhDbGFzc1N0YXRpYyIsIm1hc3RlckRiaCIsImNvbnNvbGUiLCJsb2ciLCJfZGIiLCJ0aHJlYWRJZCIsInJvd3MiLCJxdWVyeVN5bmMiLCJUT1RBTCIsImxlbmd0aCIsIkNPVU5URVIiLCJyb3ciLCJvIiwiX2xvY2F0ZWZpZWxkIiwib2JqIiwic2V0RmllbGRTZXQiLCJjdXJyZW50VmFsdWUiLCJuZXdWYWx1ZSIsInBhcnRzIiwic3BsaXQiLCJwdXNoIiwiam9pbiIsInNldEZpZWxkUmVtb3ZlIiwidG9SZW1vdmUiLCJmaWx0ZXIiLCJ2Iiwic2V0RmllbGRDaGVjayIsImNoZWNrIiwiaW5jbHVkZXMiLCJ0cmFuc2FjdGlvbldpdGhNZSIsIkNsYXNzIiwiT2JqZWN0Iiwia2V5cyIsIl9jaGFuZ2VzIiwiRXJyb3IiLCJuYW1lIiwiZGJoIiwiZXhlY1RyYW5zYWN0aW9uIiwicGFyYW1zIiwiX2xvY2F0ZUZpZWxkIiwibWUiLCJmcm9tUHJvbWlzZSIsIl9yZWFkIiwiY29tbWFTb3J0IiwiYSIsImIiLCJjYSIsInN0cmNvdW50Il0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FB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ZSBmcm9tICdmaWJlcnMvZnV0dXJlJztcblxuaW1wb3J0IERiUmVjb3JkMiBmcm9tIFwiYWR2ZXJzLWRicmVjb3JkMlwiO1xuaW1wb3J0IE15c3FsRGF0YWJhc2UgZnJvbSBcIi4vTXlzcWxEYXRhYmFzZVwiO1xuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIGRhdGFiYXNlIHJlY29yZCBjbGFzcy5cbioqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRGJSZWNvcmQgZXh0ZW5kcyBEYlJlY29yZDIge1xuXHQvKipcblx0ICogQGluaGVyaXRkb2Ncblx0ICovXG5cdGNvbnN0cnVjdG9yKG9wdGlvbnMgPSB7fSkge1xuXHRcdHN1cGVyKG9wdGlvbnMpO1xuXG5cdFx0Y29uc3QgZnV0dXJlID0gbmV3IEZ1dHVyZSgpO1xuXHRcdHN1cGVyLmluaXQoKVxuXHRcdFx0LnRoZW4ocmVzID0+IGZ1dHVyZS5yZXR1cm4ocmVzKSlcblx0XHRcdC5jYXRjaChlcnIgPT4geyBmdXR1cmUudGhyb3coZXJyKSB9KTtcblx0XHRyZXR1cm4gZnV0dXJlLndhaXQoKTtcblx0fVxuXG5cdGluaXQoKSB7XG5cdFx0Ly8gRW1wdHkgaGVyZSwgRGJSZWNvcmQgZG9lcyBub3QgbmVlZCBpbml0XG5cdH1cblxuXHRzdGF0aWMgX2dldERiaENsYXNzKCkge1xuXHRcdHJldHVybiBNeXNxbERhdGFiYXNlO1xuXHR9XG5cblx0LyoqXG5cdCAqIFRyaWVzIGNyZWF0aW5nIGFuIG9iamVjdCBieSBsb2NhdGUgZmllbGQva2V5cy4gVW5saWtlIGNvbnN0cnVjdG9yLCBkb2VzXG5cdCAqIG5vdCB0aHJvdyBhbiBlcnJvciBmb3Igbm9uLWV4aXN0aW5nIHJlY29yZCBhbmQgcmV0dXJucyBudWxsIGluc3RlYWQuXG5cdCAqIEBwYXJhbSBvcHRpb25zXG5cdCAqL1xuXHRzdGF0aWMgdHJ5Q3JlYXRlKG9wdGlvbnMgPSB7fSkge1xuXHRcdHRyeSB7XG5cdFx0XHRyZXR1cm4gbmV3IHRoaXMob3B0aW9ucyk7XG5cdFx0fSBjYXRjaChleCkge1xuXHRcdFx0aWYoZXgubWVzc2FnZSA9PSBcIkVfREJfTk9fT0JKRUNUXCIpIHsgcmV0dXJuIG51bGw7IH1cblx0XHRcdGVsc2UgeyB0aHJvdyBleDsgfVxuXHRcdH1cblx0fVxuXG5cblx0LyoqIENyZWF0ZXMgYSBuZXcgZGF0YWJhc2UgcmVjb3JkLCBwb3B1bGF0aW5nIGl0IGZyb20gdGhlIGZpZWxkcyBsaXN0XG5cdCAqIEBwYXJhbSB7T2JqZWN0fSBmaWVsZHNcblx0ICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIG9wdGlvbnMgZm9yIGRhdGFiYXNlIGNyZWF0aW9uXG5cdCAqIEByZXR1cm5zIHtEYlJlY29yZH0gdGhlIG5ld2x5IGNyZWF0ZWQgb2JqZWN0XG5cdCAqL1xuXHRzdGF0aWMgbmV3UmVjb3JkKGZpZWxkcywgb3B0aW9ucyA9IHt9KSB7XG5cdFx0Y29uc3QgZnV0dXJlID0gbmV3IEZ1dHVyZSgpO1xuXHRcdHN1cGVyLm5ld1JlY29yZChmaWVsZHMsIG9wdGlvbnMpXG5cdFx0XHQudGhlbihyZXMgPT4gZnV0dXJlLnJldHVybihyZXMpKVxuXHRcdFx0LmNhdGNoKGVyciA9PiB7IGZ1dHVyZS50aHJvdyhlcnIpIH0pO1xuXHRcdHJldHVybiBmdXR1cmUud2FpdCgpO1xuXHR9XG5cblxuXHQvKipcblx0ICogSW5zdHJ1Y3RzIGNsYXNzIHRvIGVpdGhlciBzYXZlIGNoYW5nZXMgdG8gZGIgYWZ0ZXIgZWFjaCBmaWVsZCB1cGRhdGUsIG9yXG5cdCAqIGFjY3VtdWxhdGUgdGhlIGNoYW5nZXMuXG5cdCAqIEBwYXJhbSB7Ym9vbGVhbn0gYXV0b1xuXHQgKi9cblx0YXV0b2NvbW1pdChhdXRvKSB7XG5cdFx0aWYoYXV0byAmJiAhdGhpcy5fYXV0b2NvbW1pdCkge1xuXHRcdFx0Ly8gSWYgdGhlcmUgYXJlIHBvdGVudGlhbCB1bnNhdmVkIGNoYW5nZXMsIHNhdmUgdGhlbVxuXHRcdFx0dGhpcy5jb21taXQoKTtcblx0XHR9XG5cdFx0dGhpcy5fYXV0b2NvbW1pdCA9IGF1dG87XG5cdH1cblxuXHQvKipcblx0ICogU2F2ZSBhY2N1bXVsYXRlZCBjaGFuZ2VkIGZpZWxkcywgaWYgYW55XG5cdCAqL1xuXHRjb21taXQob3B0aW9ucyA9IHt9KSB7XG5cdFx0Ly8gSWYgY2FsbGVkIHdpdGhvdXQgYSBmaWJlciwgZmFsbCB0byBzdXBlclxuXHRcdGlmKEZpYmVyLmN1cnJlbnQgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0cmV0dXJuIHN1cGVyLmNvbW1pdChvcHRpb25zKTtcblx0XHR9XG5cblx0XHRjb25zdCBmdXR1cmUgPSBuZXcgRnV0dXJlKCk7XG5cdFx0c3VwZXIuY29tbWl0KClcblx0XHRcdC50aGVuKHJlcyA9PiBmdXR1cmUucmV0dXJuKHJlcykpXG5cdFx0XHQuY2F0Y2goZXJyID0+IHsgZnV0dXJlLnRocm93KGVycikgfSk7XG5cdFx0cmV0dXJuIGZ1dHVyZS53YWl0KCk7XG5cdH1cblxuXG5cdC8qKlxuXHQgKiBSZW1vdmVzIHRoZSByZWNvcmQgZnJvbSB0aGUgZGF0YWJhc2UuIE5vIHZlcmlmaWNhdGlvbiBvciBpbnRlZ3JpdHkgY2hlY2tzXG5cdCAqIGFyZSBiZWluZyBwZXJmb3JtZWQsIHRoZXkgYXJlIHVwIHRvIGNhbGxlci5cblx0ICovXG5cdGRlbGV0ZVJlY29yZCgpIHtcblx0XHRjb25zdCBmdXR1cmUgPSBuZXcgRnV0dXJlKCk7XG5cdFx0c3VwZXIuZGVsZXRlUmVjb3JkKClcblx0XHRcdC50aGVuKHJlcyA9PiBmdXR1cmUucmV0dXJuKHJlcykpXG5cdFx0XHQuY2F0Y2goZXJyID0+IHsgZnV0dXJlLnRocm93KGVycikgfSk7XG5cdFx0cmV0dXJuIGZ1dHVyZS53YWl0KCk7XG5cdH1cblxuXG5cdC8qKlxuXHQgKiBAaW5oZXJpdGRvY1xuXHQgKi9cblx0c3RhdGljIGZvckVhY2gob3B0aW9ucywgY2IpIHtcblx0XHRjb25zdCB3aGVyZSA9IFtdO1xuXHRcdGNvbnN0IHFwYXJhbSA9IFtdO1xuXHRcdGNvbnN0IHNxbCA9IHRoaXMuX3ByZXBhcmVGb3JFYWNoKG9wdGlvbnMsIHdoZXJlLCBxcGFyYW0pO1xuXG5cdFx0Ly9cblx0XHQvLyBJdGVyYXRlXG5cdFx0Y29uc3QgX2RiaCA9ICB0aGlzLl9nZXREYmhDbGFzc1N0YXRpYygpLm1hc3RlckRiaCgpO1xuXG5cdFx0aWYoVEFSR0VUID09PSBcImRldmVsb3BtZW50XCIpIHtcblx0XHRcdGNvbnNvbGUubG9nKGAke19kYmguX2RiLnRocmVhZElkfTogd2lsbCBiZSBydW5uaW5nIGZvckVhY2ggcXVlcnlgKTtcblx0XHR9XG5cblx0XHRjb25zdCByb3dzID0gX2RiaC5xdWVyeVN5bmMoc3FsLCBxcGFyYW0pO1xuXHRcdG9wdGlvbnMuVE9UQUwgPSByb3dzLmxlbmd0aDtcblxuXHRcdGlmKGNiKSB7XG5cdFx0XHRvcHRpb25zLkNPVU5URVIgPSAwO1xuXG5cdFx0XHRmb3IoY29uc3Qgcm93IG9mIHJvd3MpIHtcblx0XHRcdFx0b3B0aW9ucy5DT1VOVEVSKys7XG5cblx0XHRcdFx0Y29uc3QgbyA9IHt9O1xuXHRcdFx0XHRvW3RoaXMuX2xvY2F0ZWZpZWxkKCldID0gcm93W3RoaXMuX2xvY2F0ZWZpZWxkKCldO1xuXHRcdFx0XHRjb25zdCBvYmogPSBuZXcgdGhpcyhvKTtcblxuXHRcdFx0XHQvLyBXYWl0IGZvciBpdGVyYXRvciB0byBlbmRcblx0XHRcdFx0Y2Iob2JqLCBvcHRpb25zKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0b3B0aW9ucy5DT1VOVEVSID0gb3B0aW9ucy5UT1RBTDtcblx0XHR9XG5cblx0XHRyZXR1cm4gb3B0aW9ucy5DT1VOVEVSO1xuXHR9XG5cblxuXHRzdGF0aWMgX2dldERiaENsYXNzU3RhdGljKCkge1xuXHRcdHJldHVybiBNeXNxbERhdGFiYXNlO1xuXHR9XG5cdF9nZXREYmhDbGFzcygpIHtcblx0XHRyZXR1cm4gTXlzcWxEYXRhYmFzZTtcblx0fVxuXG5cdC8vIEhlbHBlciBmdW5jdGlvbnNcblxuXHQvKipcblx0ICogQWRkIHZhbHVlIHRvIG15c3FsIFNFVCBmaWVsZFxuXHQgKiBAcGFyYW0gY3VycmVudFZhbHVlXG5cdCAqIEBwYXJhbSBuZXdWYWx1ZVxuXHQgKi9cblx0c3RhdGljIHNldEZpZWxkU2V0KGN1cnJlbnRWYWx1ZSwgbmV3VmFsdWUpIHtcblx0XHRjb25zdCBwYXJ0cyA9ICh0eXBlb2YoY3VycmVudFZhbHVlKSA9PT0gXCJzdHJpbmdcIiAmJiBjdXJyZW50VmFsdWUgIT09IFwiXCIpP1xuXHRcdFx0Y3VycmVudFZhbHVlLnNwbGl0KFwiLFwiKTpcblx0XHRcdFtdO1xuXHRcdHBhcnRzLnB1c2gobmV3VmFsdWUpO1xuXHRcdHJldHVybiBwYXJ0cy5qb2luKFwiLFwiKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBSZW1vdmUgdmFsdWUgZnJvbSBteXNxbCBTRVQgZmllbGRcblx0ICogQHBhcmFtIGN1cnJlbnRWYWx1ZVxuXHQgKiBAcGFyYW0gdG9SZW1vdmVcblx0ICovXG5cdHN0YXRpYyBzZXRGaWVsZFJlbW92ZShjdXJyZW50VmFsdWUsIHRvUmVtb3ZlKSB7XG5cdFx0bGV0IHBhcnRzID0gKHR5cGVvZihjdXJyZW50VmFsdWUpID09PSBcInN0cmluZ1wiKT8gY3VycmVudFZhbHVlLnNwbGl0KFwiLFwiKTogW107XG5cdFx0cGFydHMgPSBwYXJ0cy5maWx0ZXIodiA9PiB2ICE9PSB0b1JlbW92ZSk7XG5cdFx0cmV0dXJuIHBhcnRzLmpvaW4oXCIsXCIpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENoZWNrIGlmIHZhbHVlIGluIGluIG15c3FsIFNFVCBmaWVsZFxuXHQgKiBAcGFyYW0gY3VycmVudFZhbHVlXG5cdCAqIEBwYXJhbSB0b1JlbW92ZVxuXHQgKi9cblx0c3RhdGljIHNldEZpZWxkQ2hlY2soY3VycmVudFZhbHVlLCBjaGVjaykge1xuXHRcdGNvbnN0IHBhcnRzID0gKHR5cGVvZihjdXJyZW50VmFsdWUpID09PSBcInN0cmluZ1wiKT8gY3VycmVudFZhbHVlLnNwbGl0KFwiLFwiKTogW107XG5cdFx0cmV0dXJuIHBhcnRzLmluY2x1ZGVzKGNoZWNrKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBAaW5oZXJpdGRvY1xuXHQgKi9cblx0dHJhbnNhY3Rpb25XaXRoTWUoY2IpIHtcblx0XHRjb25zdCBDbGFzcyA9IHRoaXMuY29uc3RydWN0b3I7XG5cblx0XHQvLyBNYWtlIHN1cmUgd2UgYXJlIGNvbW1pdHRlZFxuXHRcdGlmKE9iamVjdC5rZXlzKHRoaXMuX2NoYW5nZXMpLmxlbmd0aCA+IDApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihgJHtDbGFzcy5uYW1lfTogT2JqZWN0IGhhcyB1bmNvbW1pdHRlZCBjaGFuZ2VzIGJlZm9yZSB0cmFuc2FjdGlvbmApO1xuXHRcdH1cblxuXHRcdGNvbnN0IGRiaCA9IENsYXNzLm1hc3RlckRiaCgpO1xuXHRcdGRiaC5leGVjVHJhbnNhY3Rpb24oKCkgPT4ge1xuXHRcdFx0Y29uc3QgcGFyYW1zID0ge307XG5cdFx0XHRwYXJhbXNbdGhpcy5fbG9jYXRlRmllbGRdID0gdGhpc1t0aGlzLl9sb2NhdGVGaWVsZF0oKTtcblx0XHRcdGNvbnN0IG1lID0gbmV3IHRoaXMuY29uc3RydWN0b3IocGFyYW1zKTtcblxuXHRcdFx0cmV0dXJuIGNiKG1lKTtcblx0XHR9KTtcblxuXHRcdC8vIFJlLXJlYWQgb3VyIG9iamVjdCBhZnRlciB0aGUgdHJhbnNhY3Rpb25cblx0XHRGdXR1cmUuZnJvbVByb21pc2UoXG5cdFx0XHR0aGlzLl9yZWFkKHRoaXNbdGhpcy5fbG9jYXRlRmllbGRdKCkpXG5cdFx0KS53YWl0KCk7XG5cdH1cblxufVxuXG5cbi8qKlxuICogVGhlIHNvcnRpbmcgZnVuY3Rpb24gdG8gZ2V0IGVudHJpZXMgd2l0aCBtb3JlIGNvbW1hcyBmaXJzdFxuICogQHBhcmFtIGFcbiAqIEBwYXJhbSBiXG4gKi9cbmZ1bmN0aW9uIGNvbW1hU29ydChhLGIpIHtcblx0Y29uc3QgY2EgPSBzdHJjb3VudChhLCBcIixcIik7XG5cdGNvbnN0IGNiID0gc3RyY291bnQoYiwgXCIsXCIpO1xuXHRyZXR1cm4gY2E+Y2I/IC0xIDogMTtcbn1cbiJdfQ==