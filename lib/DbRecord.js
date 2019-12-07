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
   * @inheritdoc
   */


  static forEach(options, cb) {
    const where = [];
    const qparam = [];

    const sql = this._prepareForEach(options, where, qparam); //
    // Iterate


    const _dbh = this._getDbhClassStatic().masterDbh();

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9EYlJlY29yZC5qcyJdLCJuYW1lcyI6WyJEYlJlY29yZCIsIkRiUmVjb3JkMiIsImNvbnN0cnVjdG9yIiwib3B0aW9ucyIsImZ1dHVyZSIsIkZ1dHVyZSIsImluaXQiLCJ0aGVuIiwicmVzIiwicmV0dXJuIiwiY2F0Y2giLCJlcnIiLCJ0aHJvdyIsIndhaXQiLCJfZ2V0RGJoQ2xhc3MiLCJNeXNxbERhdGFiYXNlIiwidHJ5Q3JlYXRlIiwiZXgiLCJtZXNzYWdlIiwibmV3UmVjb3JkIiwiZmllbGRzIiwib2JqIiwiT2JqZWN0Iiwia2V5cyIsImZvckVhY2giLCJrIiwiX2NoYW5nZXMiLCJfcmF3IiwiY29tbWl0IiwiYXV0b2NvbW1pdCIsImF1dG8iLCJfYXV0b2NvbW1pdCIsImRlbGV0ZVJlY29yZCIsImNiIiwid2hlcmUiLCJxcGFyYW0iLCJzcWwiLCJfcHJlcGFyZUZvckVhY2giLCJfZGJoIiwiX2dldERiaENsYXNzU3RhdGljIiwibWFzdGVyRGJoIiwicm93cyIsInF1ZXJ5U3luYyIsIlRPVEFMIiwibGVuZ3RoIiwiQ09VTlRFUiIsInJvdyIsIm8iLCJfbG9jYXRlZmllbGQiLCJzZXRGaWVsZFNldCIsImN1cnJlbnRWYWx1ZSIsIm5ld1ZhbHVlIiwicGFydHMiLCJzcGxpdCIsInB1c2giLCJqb2luIiwic2V0RmllbGRSZW1vdmUiLCJ0b1JlbW92ZSIsImZpbHRlciIsInYiLCJzZXRGaWVsZENoZWNrIiwiY2hlY2siLCJpbmNsdWRlcyIsInRyYW5zYWN0aW9uV2l0aE1lIiwiQ2xhc3MiLCJFcnJvciIsIm5hbWUiLCJkYmgiLCJleGVjVHJhbnNhY3Rpb24iLCJwYXJhbXMiLCJfbG9jYXRlRmllbGQiLCJtZSIsImZyb21Qcm9taXNlIiwiX3JlYWQiLCJjb21tYVNvcnQiLCJhIiwiYiIsImNhIiwic3RyY291bnQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTs7QUFFQTs7QUFDQTs7OztBQUVBOzs7QUFHZSxNQUFNQSxRQUFOLFNBQXVCQyx1QkFB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QTs7QUFFRCxVQUFNQyxHQUFHLEdBQUdILEtBQUssQ0FBQ3hCLFNBQU4sRUFBWjtBQUNBMkIsSUFBQUEsR0FBRyxDQUFDQyxlQUFKLENBQW9CLE1BQU07QUFDekIsWUFBTUMsTUFBTSxHQUFHLEVBQWY7QUFDQUEsTUFBQUEsTUFBTSxDQUFDLEtBQUtDLFlBQU4sQ0FBTixHQUE0QixLQUFLLEtBQUtBLFlBQVYsR0FBNUI7QUFDQSxZQUFNQyxFQUFFLEdBQUcsSUFBSSxLQUFLckUsV0FBVCxDQUFxQm1FLE1BQXJCLENBQVg7QUFFQSxhQUFPcEMsRUFBRSxDQUFDc0MsRUFBRCxDQUFUO0FBQ0EsS0FORCxFQVRxQixDQWlCckI7O0FBQ0FsRSxvQkFBT21FLFdBQVAsQ0FDQyxLQUFLQyxLQUFMLENBQVcsS0FBSyxLQUFLSCxZQUFWLEdBQVgsQ0FERCxFQUVFekQsSUFGRjtBQUdBOztBQXhNOEM7QUE2TWhEOzs7Ozs7Ozs7QUFLQSxTQUFTNkQsU0FBVCxDQUFtQkMsQ0FBbkIsRUFBcUJDLENBQXJCLEVBQXdCO0FBQ3ZCLFFBQU1DLEVBQUUsR0FBR0MsUUFBUSxDQUFDSCxDQUFELEVBQUksR0FBSixDQUFuQjtBQUNBLFFBQU0xQyxFQUFFLEdBQUc2QyxRQUFRLENBQUNGLENBQUQsRUFBSSxHQUFKLENBQW5CO0FBQ0EsU0FBT0MsRUFBRSxHQUFDNUMsRUFBSCxHQUFPLENBQUMsQ0FBUixHQUFZLENBQW5CO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgRnV0dXJlIGZyb20gJ2ZpYmVycy9mdXR1cmUnO1xuXG5pbXBvcnQgRGJSZWNvcmQyIGZyb20gXCJhZHZlcnMtZGJyZWNvcmQyXCI7XG5pbXBvcnQgTXlzcWxEYXRhYmFzZSBmcm9tIFwiLi9NeXNxbERhdGFiYXNlXCI7XG5cbi8qKlxuICogUmVwcmVzZW50cyB0aGUgZGF0YWJhc2UgcmVjb3JkIGNsYXNzLlxuKiovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBEYlJlY29yZCBleHRlbmRzIERiUmVjb3JkMiB7XG5cdC8qKlxuXHQgKiBAaW5oZXJpdGRvY1xuXHQgKi9cblx0Y29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KSB7XG5cdFx0c3VwZXIob3B0aW9ucyk7XG5cblx0XHRjb25zdCBmdXR1cmUgPSBuZXcgRnV0dXJlKCk7XG5cdFx0c3VwZXIuaW5pdCgpXG5cdFx0XHQudGhlbihyZXMgPT4gZnV0dXJlLnJldHVybihyZXMpKVxuXHRcdFx0LmNhdGNoKGVyciA9PiB7IGZ1dHVyZS50aHJvdyhlcnIpIH0pO1xuXHRcdHJldHVybiBmdXR1cmUud2FpdCgpO1xuXHR9XG5cblx0aW5pdCgpIHtcblx0XHQvLyBFbXB0eSBoZXJlLCBEYlJlY29yZCBkb2VzIG5vdCBuZWVkIGluaXRcblx0fVxuXG5cdHN0YXRpYyBfZ2V0RGJoQ2xhc3MoKSB7XG5cdFx0cmV0dXJuIE15c3FsRGF0YWJhc2U7XG5cdH1cblxuXHQvKipcblx0ICogVHJpZXMgY3JlYXRpbmcgYW4gb2JqZWN0IGJ5IGxvY2F0ZSBmaWVsZC9rZXlzLiBVbmxpa2UgY29uc3RydWN0b3IsIGRvZXNcblx0ICogbm90IHRocm93IGFuIGVycm9yIGZvciBub24tZXhpc3RpbmcgcmVjb3JkIGFuZCByZXR1cm5zIG51bGwgaW5zdGVhZC5cblx0ICogQHBhcmFtIG9wdGlvbnNcblx0ICovXG5cdHN0YXRpYyB0cnlDcmVhdGUob3B0aW9ucyA9IHt9KSB7XG5cdFx0dHJ5IHtcblx0XHRcdHJldHVybiBuZXcgdGhpcyhvcHRpb25zKTtcblx0XHR9IGNhdGNoKGV4KSB7XG5cdFx0XHRpZihleC5tZXNzYWdlID09IFwiRV9EQl9OT19PQkpFQ1RcIikgeyByZXR1cm4gbnVsbDsgfVxuXHRcdFx0ZWxzZSB7IHRocm93IGV4OyB9XG5cdFx0fVxuXHR9XG5cblxuXHQvKiogQ3JlYXRlcyBhIG5ldyBkYXRhYmFzZSByZWNvcmQsIHBvcHVsYXRpbmcgaXQgZnJvbSB0aGUgZmllbGRzIGxpc3Rcblx0ICogQHBhcmFtIHtPYmplY3R9IGZpZWxkc1xuXHQgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gb3B0aW9ucyBmb3IgZGF0YWJhc2UgY3JlYXRpb25cblx0ICogQHJldHVybnMge0RiUmVjb3JkfSB0aGUgbmV3bHkgY3JlYXRlZCBvYmplY3Rcblx0ICovXG5cdHN0YXRpYyBuZXdSZWNvcmQoZmllbGRzLCBvcHRpb25zID0ge30pIHtcblx0XHRjb25zdCBvYmogPSBuZXcgdGhpcygpO1xuXG5cdFx0T2JqZWN0LmtleXMoZmllbGRzKS5mb3JFYWNoKChrKSA9PiB7XG5cdFx0XHRvYmouX2NoYW5nZXNba10gPSB0cnVlO1xuXHRcdFx0b2JqLl9yYXdba10gPSBmaWVsZHNba107XG5cdFx0fSk7XG5cblx0XHRvYmouY29tbWl0KCk7XG5cdFx0cmV0dXJuIG9iajtcblx0fVxuXG5cblx0LyoqXG5cdCAqIEluc3RydWN0cyBjbGFzcyB0byBlaXRoZXIgc2F2ZSBjaGFuZ2VzIHRvIGRiIGFmdGVyIGVhY2ggZmllbGQgdXBkYXRlLCBvclxuXHQgKiBhY2N1bXVsYXRlIHRoZSBjaGFuZ2VzLlxuXHQgKiBAcGFyYW0ge2Jvb2xlYW59IGF1dG9cblx0ICovXG5cdGF1dG9jb21taXQoYXV0bykge1xuXHRcdGlmKGF1dG8gJiYgIXRoaXMuX2F1dG9jb21taXQpIHtcblx0XHRcdC8vIElmIHRoZXJlIGFyZSBwb3RlbnRpYWwgdW5zYXZlZCBjaGFuZ2VzLCBzYXZlIHRoZW1cblx0XHRcdHRoaXMuY29tbWl0KCk7XG5cdFx0fVxuXHRcdHRoaXMuX2F1dG9jb21taXQgPSBhdXRvO1xuXHR9XG5cblx0LyoqXG5cdCAqIFNhdmUgYWNjdW11bGF0ZWQgY2hhbmdlZCBmaWVsZHMsIGlmIGFueVxuXHQgKi9cblx0Y29tbWl0KCkge1xuXHRcdGNvbnN0IGZ1dHVyZSA9IG5ldyBGdXR1cmUoKTtcblx0XHRzdXBlci5jb21taXQoKVxuXHRcdFx0LnRoZW4ocmVzID0+IGZ1dHVyZS5yZXR1cm4ocmVzKSlcblx0XHRcdC5jYXRjaChlcnIgPT4geyBmdXR1cmUudGhyb3coZXJyKSB9KTtcblx0XHRyZXR1cm4gZnV0dXJlLndhaXQoKTtcblx0fVxuXG5cblx0LyoqXG5cdCAqIFJlbW92ZXMgdGhlIHJlY29yZCBmcm9tIHRoZSBkYXRhYmFzZS4gTm8gdmVyaWZpY2F0aW9uIG9yIGludGVncml0eSBjaGVja3Ncblx0ICogYXJlIGJlaW5nIHBlcmZvcm1lZCwgdGhleSBhcmUgdXAgdG8gY2FsbGVyLlxuXHQgKi9cblx0ZGVsZXRlUmVjb3JkKCkge1xuXHRcdGNvbnN0IGZ1dHVyZSA9IG5ldyBGdXR1cmUoKTtcblx0XHRzdXBlci5kZWxldGVSZWNvcmQoKVxuXHRcdFx0LnRoZW4ocmVzID0+IGZ1dHVyZS5yZXR1cm4ocmVzKSlcblx0XHRcdC5jYXRjaChlcnIgPT4geyBmdXR1cmUudGhyb3coZXJyKSB9KTtcblx0XHRyZXR1cm4gZnV0dXJlLndhaXQoKTtcblx0fVxuXG5cblx0LyoqXG5cdCAqIEBpbmhlcml0ZG9jXG5cdCAqL1xuXHRzdGF0aWMgZm9yRWFjaChvcHRpb25zLCBjYikge1xuXHRcdGNvbnN0IHdoZXJlID0gW107XG5cdFx0Y29uc3QgcXBhcmFtID0gW107XG5cdFx0Y29uc3Qgc3FsID0gdGhpcy5fcHJlcGFyZUZvckVhY2gob3B0aW9ucywgd2hlcmUsIHFwYXJhbSk7XG5cblx0XHQvL1xuXHRcdC8vIEl0ZXJhdGVcblx0XHRjb25zdCBfZGJoID0gIHRoaXMuX2dldERiaENsYXNzU3RhdGljKCkubWFzdGVyRGJoKCk7XG5cblx0XHRpZihUQVJHRVQgPT09IFwiZGV2ZWxvcG1lbnRcIikge1xuXHRcdFx0Ly9jb25zb2xlLmxvZyhgJHtfZGJoLl9kYi50aHJlYWRJZH06IHdpbGwgYmUgcnVubmluZyBmb3JFYWNoIHF1ZXJ5YCk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgcm93cyA9IF9kYmgucXVlcnlTeW5jKHNxbCwgcXBhcmFtKTtcblx0XHRvcHRpb25zLlRPVEFMID0gcm93cy5sZW5ndGg7XG5cblx0XHRpZihjYikge1xuXHRcdFx0b3B0aW9ucy5DT1VOVEVSID0gMDtcblxuXHRcdFx0Zm9yKGNvbnN0IHJvdyBvZiByb3dzKSB7XG5cdFx0XHRcdG9wdGlvbnMuQ09VTlRFUisrO1xuXG5cdFx0XHRcdGNvbnN0IG8gPSB7fTtcblx0XHRcdFx0b1t0aGlzLl9sb2NhdGVmaWVsZCgpXSA9IHJvd1t0aGlzLl9sb2NhdGVmaWVsZCgpXTtcblx0XHRcdFx0Y29uc3Qgb2JqID0gbmV3IHRoaXMobyk7XG5cblx0XHRcdFx0Ly8gV2FpdCBmb3IgaXRlcmF0b3IgdG8gZW5kXG5cdFx0XHRcdGNiKG9iaiwgb3B0aW9ucyk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdG9wdGlvbnMuQ09VTlRFUiA9IG9wdGlvbnMuVE9UQUw7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG9wdGlvbnMuQ09VTlRFUjtcblx0fVxuXG5cblx0c3RhdGljIF9nZXREYmhDbGFzc1N0YXRpYygpIHtcblx0XHRyZXR1cm4gTXlzcWxEYXRhYmFzZTtcblx0fVxuXHRfZ2V0RGJoQ2xhc3MoKSB7XG5cdFx0cmV0dXJuIE15c3FsRGF0YWJhc2U7XG5cdH1cblxuXHQvLyBIZWxwZXIgZnVuY3Rpb25zXG5cblx0LyoqXG5cdCAqIEFkZCB2YWx1ZSB0byBteXNxbCBTRVQgZmllbGRcblx0ICogQHBhcmFtIGN1cnJlbnRWYWx1ZVxuXHQgKiBAcGFyYW0gbmV3VmFsdWVcblx0ICovXG5cdHN0YXRpYyBzZXRGaWVsZFNldChjdXJyZW50VmFsdWUsIG5ld1ZhbHVlKSB7XG5cdFx0Y29uc3QgcGFydHMgPSAodHlwZW9mKGN1cnJlbnRWYWx1ZSkgPT09IFwic3RyaW5nXCIgJiYgY3VycmVudFZhbHVlICE9PSBcIlwiKT9cblx0XHRcdGN1cnJlbnRWYWx1ZS5zcGxpdChcIixcIik6XG5cdFx0XHRbXTtcblx0XHRwYXJ0cy5wdXNoKG5ld1ZhbHVlKTtcblx0XHRyZXR1cm4gcGFydHMuam9pbihcIixcIik7XG5cdH1cblxuXHQvKipcblx0ICogUmVtb3ZlIHZhbHVlIGZyb20gbXlzcWwgU0VUIGZpZWxkXG5cdCAqIEBwYXJhbSBjdXJyZW50VmFsdWVcblx0ICogQHBhcmFtIHRvUmVtb3ZlXG5cdCAqL1xuXHRzdGF0aWMgc2V0RmllbGRSZW1vdmUoY3VycmVudFZhbHVlLCB0b1JlbW92ZSkge1xuXHRcdGxldCBwYXJ0cyA9ICh0eXBlb2YoY3VycmVudFZhbHVlKSA9PT0gXCJzdHJpbmdcIik/IGN1cnJlbnRWYWx1ZS5zcGxpdChcIixcIik6IFtdO1xuXHRcdHBhcnRzID0gcGFydHMuZmlsdGVyKHYgPT4gdiAhPT0gdG9SZW1vdmUpO1xuXHRcdHJldHVybiBwYXJ0cy5qb2luKFwiLFwiKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDaGVjayBpZiB2YWx1ZSBpbiBpbiBteXNxbCBTRVQgZmllbGRcblx0ICogQHBhcmFtIGN1cnJlbnRWYWx1ZVxuXHQgKiBAcGFyYW0gdG9SZW1vdmVcblx0ICovXG5cdHN0YXRpYyBzZXRGaWVsZENoZWNrKGN1cnJlbnRWYWx1ZSwgY2hlY2spIHtcblx0XHRjb25zdCBwYXJ0cyA9ICh0eXBlb2YoY3VycmVudFZhbHVlKSA9PT0gXCJzdHJpbmdcIik/IGN1cnJlbnRWYWx1ZS5zcGxpdChcIixcIik6IFtdO1xuXHRcdHJldHVybiBwYXJ0cy5pbmNsdWRlcyhjaGVjayk7XG5cdH1cblxuXHQvKipcblx0ICogQGluaGVyaXRkb2Ncblx0ICovXG5cdHRyYW5zYWN0aW9uV2l0aE1lKGNiKSB7XG5cdFx0Y29uc3QgQ2xhc3MgPSB0aGlzLmNvbnN0cnVjdG9yO1xuXG5cdFx0Ly8gTWFrZSBzdXJlIHdlIGFyZSBjb21taXR0ZWRcblx0XHRpZihPYmplY3Qua2V5cyh0aGlzLl9jaGFuZ2VzKS5sZW5ndGggPiAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYCR7Q2xhc3MubmFtZX06IE9iamVjdCBoYXMgdW5jb21taXR0ZWQgY2hhbmdlcyBiZWZvcmUgdHJhbnNhY3Rpb25gKTtcblx0XHR9XG5cblx0XHRjb25zdCBkYmggPSBDbGFzcy5tYXN0ZXJEYmgoKTtcblx0XHRkYmguZXhlY1RyYW5zYWN0aW9uKCgpID0+IHtcblx0XHRcdGNvbnN0IHBhcmFtcyA9IHt9O1xuXHRcdFx0cGFyYW1zW3RoaXMuX2xvY2F0ZUZpZWxkXSA9IHRoaXNbdGhpcy5fbG9jYXRlRmllbGRdKCk7XG5cdFx0XHRjb25zdCBtZSA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKHBhcmFtcyk7XG5cblx0XHRcdHJldHVybiBjYihtZSk7XG5cdFx0fSk7XG5cblx0XHQvLyBSZS1yZWFkIG91ciBvYmplY3QgYWZ0ZXIgdGhlIHRyYW5zYWN0aW9uXG5cdFx0RnV0dXJlLmZyb21Qcm9taXNlKFxuXHRcdFx0dGhpcy5fcmVhZCh0aGlzW3RoaXMuX2xvY2F0ZUZpZWxkXSgpKVxuXHRcdCkud2FpdCgpO1xuXHR9XG5cbn1cblxuXG4vKipcbiAqIFRoZSBzb3J0aW5nIGZ1bmN0aW9uIHRvIGdldCBlbnRyaWVzIHdpdGggbW9yZSBjb21tYXMgZmlyc3RcbiAqIEBwYXJhbSBhXG4gKiBAcGFyYW0gYlxuICovXG5mdW5jdGlvbiBjb21tYVNvcnQoYSxiKSB7XG5cdGNvbnN0IGNhID0gc3RyY291bnQoYSwgXCIsXCIpO1xuXHRjb25zdCBjYiA9IHN0cmNvdW50KGIsIFwiLFwiKTtcblx0cmV0dXJuIGNhPmNiPyAtMSA6IDE7XG59XG4iXX0=