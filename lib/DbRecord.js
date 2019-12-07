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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9EYlJlY29yZC5qcyJdLCJuYW1lcyI6WyJEYlJlY29yZCIsIkRiUmVjb3JkMiIsImNvbnN0cnVjdG9yIiwib3B0aW9ucyIsImZ1dHVyZSIsIkZ1dHVyZSIsImluaXQiLCJ0aGVuIiwicmVzIiwicmV0dXJuIiwiY2F0Y2giLCJlcnIiLCJ0aHJvdyIsIndhaXQiLCJfZ2V0RGJoQ2xhc3MiLCJNeXNxbERhdGFiYXNlIiwidHJ5Q3JlYXRlIiwiZXgiLCJtZXNzYWdlIiwibmV3UmVjb3JkIiwiZmllbGRzIiwib2JqIiwiT2JqZWN0Iiwia2V5cyIsImZvckVhY2giLCJrIiwiX2NoYW5nZXMiLCJfcmF3IiwiY29tbWl0IiwiYXV0b2NvbW1pdCIsImF1dG8iLCJfYXV0b2NvbW1pdCIsImRlbGV0ZVJlY29yZCIsImNiIiwid2hlcmUiLCJxcGFyYW0iLCJzcWwiLCJfcHJlcGFyZUZvckVhY2giLCJfZGJoIiwiX2dldERiaENsYXNzU3RhdGljIiwibWFzdGVyRGJoIiwiY29uc29sZSIsImxvZyIsIl9kYiIsInRocmVhZElkIiwicm93cyIsInF1ZXJ5U3luYyIsIlRPVEFMIiwibGVuZ3RoIiwiQ09VTlRFUiIsInJvdyIsIm8iLCJfbG9jYXRlZmllbGQiLCJzZXRGaWVsZFNldCIsImN1cnJlbnRWYWx1ZSIsIm5ld1ZhbHVlIiwicGFydHMiLCJzcGxpdCIsInB1c2giLCJqb2luIiwic2V0RmllbGRSZW1vdmUiLCJ0b1JlbW92ZSIsImZpbHRlciIsInYiLCJzZXRGaWVsZENoZWNrIiwiY2hlY2siLCJpbmNsdWRlcyIsInRyYW5zYWN0aW9uV2l0aE1lIiwiQ2xhc3MiLCJFcnJvciIsIm5hbWUiLCJkYmgiLCJleGVjVHJhbnNhY3Rpb24iLCJwYXJhbXMiLCJfbG9jYXRlRmllbGQiLCJtZSIsImZyb21Qcm9taXNlIiwiX3JlYWQiLCJjb21tYVNvcnQiLCJhIiwiYiIsImNhIiwic3RyY291bnQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTs7QUFFQTs7QUFDQTs7OztB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QUFLRyxRQUFqQixFQUEyQnNCLE1BQTNCLEdBQW9DLENBQXZDLEVBQTBDO0FBQ3pDLFlBQU0sSUFBSXFCLEtBQUosQ0FBVyxHQUFFRCxLQUFLLENBQUNFLElBQUsscURBQXhCLENBQU47QUFDQTs7QUFFRCxVQUFNQyxHQUFHLEdBQUdILEtBQUssQ0FBQzVCLFNBQU4sRUFBWjtBQUNBK0IsSUFBQUEsR0FBRyxDQUFDQyxlQUFKLENBQW9CLE1BQU07QUFDekIsWUFBTUMsTUFBTSxHQUFHLEVBQWY7QUFDQUEsTUFBQUEsTUFBTSxDQUFDLEtBQUtDLFlBQU4sQ0FBTixHQUE0QixLQUFLLEtBQUtBLFlBQVYsR0FBNUI7QUFDQSxZQUFNQyxFQUFFLEdBQUcsSUFBSSxLQUFLekUsV0FBVCxDQUFxQnVFLE1BQXJCLENBQVg7QUFFQSxhQUFPeEMsRUFBRSxDQUFDMEMsRUFBRCxDQUFUO0FBQ0EsS0FORCxFQVRxQixDQWlCckI7O0FBQ0F0RSxvQkFBT3VFLFdBQVAsQ0FDQyxLQUFLQyxLQUFMLENBQVcsS0FBSyxLQUFLSCxZQUFWLEdBQVgsQ0FERCxFQUVFN0QsSUFGRjtBQUdBOztBQXhNOEM7QUE2TWhEOzs7Ozs7Ozs7QUFLQSxTQUFTaUUsU0FBVCxDQUFtQkMsQ0FBbkIsRUFBcUJDLENBQXJCLEVBQXdCO0FBQ3ZCLFFBQU1DLEVBQUUsR0FBR0MsUUFBUSxDQUFDSCxDQUFELEVBQUksR0FBSixDQUFuQjtBQUNBLFFBQU05QyxFQUFFLEdBQUdpRCxRQUFRLENBQUNGLENBQUQsRUFBSSxHQUFKLENBQW5CO0FBQ0EsU0FBT0MsRUFBRSxHQUFDaEQsRUFBSCxHQUFPLENBQUMsQ0FBUixHQUFZLENBQW5CO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgRnV0dXJlIGZyb20gJ2ZpYmVycy9mdXR1cmUnO1xuXG5pbXBvcnQgRGJSZWNvcmQyIGZyb20gXCJhZHZlcnMtZGJyZWNvcmQyXCI7XG5pbXBvcnQgTXlzcWxEYXRhYmFzZSBmcm9tIFwiLi9NeXNxbERhdGFiYXNlXCI7XG5cbi8qKlxuICogUmVwcmVzZW50cyB0aGUgZGF0YWJhc2UgcmVjb3JkIGNsYXNzLlxuKiovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBEYlJlY29yZCBleHRlbmRzIERiUmVjb3JkMiB7XG5cdC8qKlxuXHQgKiBAaW5oZXJpdGRvY1xuXHQgKi9cblx0Y29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KSB7XG5cdFx0c3VwZXIob3B0aW9ucyk7XG5cblx0XHRjb25zdCBmdXR1cmUgPSBuZXcgRnV0dXJlKCk7XG5cdFx0c3VwZXIuaW5pdCgpXG5cdFx0XHQudGhlbihyZXMgPT4gZnV0dXJlLnJldHVybihyZXMpKVxuXHRcdFx0LmNhdGNoKGVyciA9PiB7IGZ1dHVyZS50aHJvdyhlcnIpIH0pO1xuXHRcdHJldHVybiBmdXR1cmUud2FpdCgpO1xuXHR9XG5cblx0aW5pdCgpIHtcblx0XHQvLyBFbXB0eSBoZXJlLCBEYlJlY29yZCBkb2VzIG5vdCBuZWVkIGluaXRcblx0fVxuXG5cdHN0YXRpYyBfZ2V0RGJoQ2xhc3MoKSB7XG5cdFx0cmV0dXJuIE15c3FsRGF0YWJhc2U7XG5cdH1cblxuXHQvKipcblx0ICogVHJpZXMgY3JlYXRpbmcgYW4gb2JqZWN0IGJ5IGxvY2F0ZSBmaWVsZC9rZXlzLiBVbmxpa2UgY29uc3RydWN0b3IsIGRvZXNcblx0ICogbm90IHRocm93IGFuIGVycm9yIGZvciBub24tZXhpc3RpbmcgcmVjb3JkIGFuZCByZXR1cm5zIG51bGwgaW5zdGVhZC5cblx0ICogQHBhcmFtIG9wdGlvbnNcblx0ICovXG5cdHN0YXRpYyB0cnlDcmVhdGUob3B0aW9ucyA9IHt9KSB7XG5cdFx0dHJ5IHtcblx0XHRcdHJldHVybiBuZXcgdGhpcyhvcHRpb25zKTtcblx0XHR9IGNhdGNoKGV4KSB7XG5cdFx0XHRpZihleC5tZXNzYWdlID09IFwiRV9EQl9OT19PQkpFQ1RcIikgeyByZXR1cm4gbnVsbDsgfVxuXHRcdFx0ZWxzZSB7IHRocm93IGV4OyB9XG5cdFx0fVxuXHR9XG5cblxuXHQvKiogQ3JlYXRlcyBhIG5ldyBkYXRhYmFzZSByZWNvcmQsIHBvcHVsYXRpbmcgaXQgZnJvbSB0aGUgZmllbGRzIGxpc3Rcblx0ICogQHBhcmFtIHtPYmplY3R9IGZpZWxkc1xuXHQgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gb3B0aW9ucyBmb3IgZGF0YWJhc2UgY3JlYXRpb25cblx0ICogQHJldHVybnMge0RiUmVjb3JkfSB0aGUgbmV3bHkgY3JlYXRlZCBvYmplY3Rcblx0ICovXG5cdHN0YXRpYyBuZXdSZWNvcmQoZmllbGRzLCBvcHRpb25zID0ge30pIHtcblx0XHRjb25zdCBvYmogPSBuZXcgdGhpcygpO1xuXG5cdFx0T2JqZWN0LmtleXMoZmllbGRzKS5mb3JFYWNoKChrKSA9PiB7XG5cdFx0XHRvYmouX2NoYW5nZXNba10gPSB0cnVlO1xuXHRcdFx0b2JqLl9yYXdba10gPSBmaWVsZHNba107XG5cdFx0fSk7XG5cblx0XHRvYmouY29tbWl0KCk7XG5cdFx0cmV0dXJuIG9iajtcblx0fVxuXG5cblx0LyoqXG5cdCAqIEluc3RydWN0cyBjbGFzcyB0byBlaXRoZXIgc2F2ZSBjaGFuZ2VzIHRvIGRiIGFmdGVyIGVhY2ggZmllbGQgdXBkYXRlLCBvclxuXHQgKiBhY2N1bXVsYXRlIHRoZSBjaGFuZ2VzLlxuXHQgKiBAcGFyYW0ge2Jvb2xlYW59IGF1dG9cblx0ICovXG5cdGF1dG9jb21taXQoYXV0bykge1xuXHRcdGlmKGF1dG8gJiYgIXRoaXMuX2F1dG9jb21taXQpIHtcblx0XHRcdC8vIElmIHRoZXJlIGFyZSBwb3RlbnRpYWwgdW5zYXZlZCBjaGFuZ2VzLCBzYXZlIHRoZW1cblx0XHRcdHRoaXMuY29tbWl0KCk7XG5cdFx0fVxuXHRcdHRoaXMuX2F1dG9jb21taXQgPSBhdXRvO1xuXHR9XG5cblx0LyoqXG5cdCAqIFNhdmUgYWNjdW11bGF0ZWQgY2hhbmdlZCBmaWVsZHMsIGlmIGFueVxuXHQgKi9cblx0Y29tbWl0KCkge1xuXHRcdGNvbnN0IGZ1dHVyZSA9IG5ldyBGdXR1cmUoKTtcblx0XHRzdXBlci5jb21taXQoKVxuXHRcdFx0LnRoZW4ocmVzID0+IGZ1dHVyZS5yZXR1cm4ocmVzKSlcblx0XHRcdC5jYXRjaChlcnIgPT4geyBmdXR1cmUudGhyb3coZXJyKSB9KTtcblx0XHRyZXR1cm4gZnV0dXJlLndhaXQoKTtcblx0fVxuXG5cblx0LyoqXG5cdCAqIFJlbW92ZXMgdGhlIHJlY29yZCBmcm9tIHRoZSBkYXRhYmFzZS4gTm8gdmVyaWZpY2F0aW9uIG9yIGludGVncml0eSBjaGVja3Ncblx0ICogYXJlIGJlaW5nIHBlcmZvcm1lZCwgdGhleSBhcmUgdXAgdG8gY2FsbGVyLlxuXHQgKi9cblx0ZGVsZXRlUmVjb3JkKCkge1xuXHRcdGNvbnN0IGZ1dHVyZSA9IG5ldyBGdXR1cmUoKTtcblx0XHRzdXBlci5kZWxldGVSZWNvcmQoKVxuXHRcdFx0LnRoZW4ocmVzID0+IGZ1dHVyZS5yZXR1cm4ocmVzKSlcblx0XHRcdC5jYXRjaChlcnIgPT4geyBmdXR1cmUudGhyb3coZXJyKSB9KTtcblx0XHRyZXR1cm4gZnV0dXJlLndhaXQoKTtcblx0fVxuXG5cblx0LyoqXG5cdCAqIEBpbmhlcml0ZG9jXG5cdCAqL1xuXHRzdGF0aWMgZm9yRWFjaChvcHRpb25zLCBjYikge1xuXHRcdGNvbnN0IHdoZXJlID0gW107XG5cdFx0Y29uc3QgcXBhcmFtID0gW107XG5cdFx0Y29uc3Qgc3FsID0gdGhpcy5fcHJlcGFyZUZvckVhY2gob3B0aW9ucywgd2hlcmUsIHFwYXJhbSk7XG5cblx0XHQvL1xuXHRcdC8vIEl0ZXJhdGVcblx0XHRjb25zdCBfZGJoID0gIHRoaXMuX2dldERiaENsYXNzU3RhdGljKCkubWFzdGVyRGJoKCk7XG5cblx0XHRpZihUQVJHRVQgPT09IFwiZGV2ZWxvcG1lbnRcIikge1xuXHRcdFx0Y29uc29sZS5sb2coYCR7X2RiaC5fZGIudGhyZWFkSWR9OiB3aWxsIGJlIHJ1bm5pbmcgZm9yRWFjaCBxdWVyeWApO1xuXHRcdH1cblxuXHRcdGNvbnN0IHJvd3MgPSBfZGJoLnF1ZXJ5U3luYyhzcWwsIHFwYXJhbSk7XG5cdFx0b3B0aW9ucy5UT1RBTCA9IHJvd3MubGVuZ3RoO1xuXG5cdFx0aWYoY2IpIHtcblx0XHRcdG9wdGlvbnMuQ09VTlRFUiA9IDA7XG5cblx0XHRcdGZvcihjb25zdCByb3cgb2Ygcm93cykge1xuXHRcdFx0XHRvcHRpb25zLkNPVU5URVIrKztcblxuXHRcdFx0XHRjb25zdCBvID0ge307XG5cdFx0XHRcdG9bdGhpcy5fbG9jYXRlZmllbGQoKV0gPSByb3dbdGhpcy5fbG9jYXRlZmllbGQoKV07XG5cdFx0XHRcdGNvbnN0IG9iaiA9IG5ldyB0aGlzKG8pO1xuXG5cdFx0XHRcdC8vIFdhaXQgZm9yIGl0ZXJhdG9yIHRvIGVuZFxuXHRcdFx0XHRjYihvYmosIG9wdGlvbnMpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRvcHRpb25zLkNPVU5URVIgPSBvcHRpb25zLlRPVEFMO1xuXHRcdH1cblxuXHRcdHJldHVybiBvcHRpb25zLkNPVU5URVI7XG5cdH1cblxuXG5cdHN0YXRpYyBfZ2V0RGJoQ2xhc3NTdGF0aWMoKSB7XG5cdFx0cmV0dXJuIE15c3FsRGF0YWJhc2U7XG5cdH1cblx0X2dldERiaENsYXNzKCkge1xuXHRcdHJldHVybiBNeXNxbERhdGFiYXNlO1xuXHR9XG5cblx0Ly8gSGVscGVyIGZ1bmN0aW9uc1xuXG5cdC8qKlxuXHQgKiBBZGQgdmFsdWUgdG8gbXlzcWwgU0VUIGZpZWxkXG5cdCAqIEBwYXJhbSBjdXJyZW50VmFsdWVcblx0ICogQHBhcmFtIG5ld1ZhbHVlXG5cdCAqL1xuXHRzdGF0aWMgc2V0RmllbGRTZXQoY3VycmVudFZhbHVlLCBuZXdWYWx1ZSkge1xuXHRcdGNvbnN0IHBhcnRzID0gKHR5cGVvZihjdXJyZW50VmFsdWUpID09PSBcInN0cmluZ1wiICYmIGN1cnJlbnRWYWx1ZSAhPT0gXCJcIik/XG5cdFx0XHRjdXJyZW50VmFsdWUuc3BsaXQoXCIsXCIpOlxuXHRcdFx0W107XG5cdFx0cGFydHMucHVzaChuZXdWYWx1ZSk7XG5cdFx0cmV0dXJuIHBhcnRzLmpvaW4oXCIsXCIpO1xuXHR9XG5cblx0LyoqXG5cdCAqIFJlbW92ZSB2YWx1ZSBmcm9tIG15c3FsIFNFVCBmaWVsZFxuXHQgKiBAcGFyYW0gY3VycmVudFZhbHVlXG5cdCAqIEBwYXJhbSB0b1JlbW92ZVxuXHQgKi9cblx0c3RhdGljIHNldEZpZWxkUmVtb3ZlKGN1cnJlbnRWYWx1ZSwgdG9SZW1vdmUpIHtcblx0XHRsZXQgcGFydHMgPSAodHlwZW9mKGN1cnJlbnRWYWx1ZSkgPT09IFwic3RyaW5nXCIpPyBjdXJyZW50VmFsdWUuc3BsaXQoXCIsXCIpOiBbXTtcblx0XHRwYXJ0cyA9IHBhcnRzLmZpbHRlcih2ID0+IHYgIT09IHRvUmVtb3ZlKTtcblx0XHRyZXR1cm4gcGFydHMuam9pbihcIixcIik7XG5cdH1cblxuXHQvKipcblx0ICogQ2hlY2sgaWYgdmFsdWUgaW4gaW4gbXlzcWwgU0VUIGZpZWxkXG5cdCAqIEBwYXJhbSBjdXJyZW50VmFsdWVcblx0ICogQHBhcmFtIHRvUmVtb3ZlXG5cdCAqL1xuXHRzdGF0aWMgc2V0RmllbGRDaGVjayhjdXJyZW50VmFsdWUsIGNoZWNrKSB7XG5cdFx0Y29uc3QgcGFydHMgPSAodHlwZW9mKGN1cnJlbnRWYWx1ZSkgPT09IFwic3RyaW5nXCIpPyBjdXJyZW50VmFsdWUuc3BsaXQoXCIsXCIpOiBbXTtcblx0XHRyZXR1cm4gcGFydHMuaW5jbHVkZXMoY2hlY2spO1xuXHR9XG5cblx0LyoqXG5cdCAqIEBpbmhlcml0ZG9jXG5cdCAqL1xuXHR0cmFuc2FjdGlvbldpdGhNZShjYikge1xuXHRcdGNvbnN0IENsYXNzID0gdGhpcy5jb25zdHJ1Y3RvcjtcblxuXHRcdC8vIE1ha2Ugc3VyZSB3ZSBhcmUgY29tbWl0dGVkXG5cdFx0aWYoT2JqZWN0LmtleXModGhpcy5fY2hhbmdlcykubGVuZ3RoID4gMCkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKGAke0NsYXNzLm5hbWV9OiBPYmplY3QgaGFzIHVuY29tbWl0dGVkIGNoYW5nZXMgYmVmb3JlIHRyYW5zYWN0aW9uYCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZGJoID0gQ2xhc3MubWFzdGVyRGJoKCk7XG5cdFx0ZGJoLmV4ZWNUcmFuc2FjdGlvbigoKSA9PiB7XG5cdFx0XHRjb25zdCBwYXJhbXMgPSB7fTtcblx0XHRcdHBhcmFtc1t0aGlzLl9sb2NhdGVGaWVsZF0gPSB0aGlzW3RoaXMuX2xvY2F0ZUZpZWxkXSgpO1xuXHRcdFx0Y29uc3QgbWUgPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcihwYXJhbXMpO1xuXG5cdFx0XHRyZXR1cm4gY2IobWUpO1xuXHRcdH0pO1xuXG5cdFx0Ly8gUmUtcmVhZCBvdXIgb2JqZWN0IGFmdGVyIHRoZSB0cmFuc2FjdGlvblxuXHRcdEZ1dHVyZS5mcm9tUHJvbWlzZShcblx0XHRcdHRoaXMuX3JlYWQodGhpc1t0aGlzLl9sb2NhdGVGaWVsZF0oKSlcblx0XHQpLndhaXQoKTtcblx0fVxuXG59XG5cblxuLyoqXG4gKiBUaGUgc29ydGluZyBmdW5jdGlvbiB0byBnZXQgZW50cmllcyB3aXRoIG1vcmUgY29tbWFzIGZpcnN0XG4gKiBAcGFyYW0gYVxuICogQHBhcmFtIGJcbiAqL1xuZnVuY3Rpb24gY29tbWFTb3J0KGEsYikge1xuXHRjb25zdCBjYSA9IHN0cmNvdW50KGEsIFwiLFwiKTtcblx0Y29uc3QgY2IgPSBzdHJjb3VudChiLCBcIixcIik7XG5cdHJldHVybiBjYT5jYj8gLTEgOiAxO1xufVxuIl19