/**
 * Created by ashish on 17/5/17.
 */
const Adapter = require('../../src/adapter');

let table = '';
let links = [];

class Model extends Adapter {
  /**
   * @returns {{}}
   */
  static get SERIALIZED() {
    return {
      objectIdField: 'objectId',
      jsonStringField: 'jsonString',
    };
  }

  /**
   * @returns {string}
   */
  static get PLURAL() {
    return '';
  }

  /**
   *
   * @param {string} t
   * @constructor
   */
  static set TABLE(t) {
    table = t;
  }

  /**
   * @returns {string}
   */
  static get TABLE() {
    return table;
  }

  /**
   * @returns {Array}
   */
  static get FIELDS() {
    return ['id', 'a', 'b', 'jsonStringField', 'objectIdField', 'name', 'plan_id', 'jsonField.address.street', 'jsonField.address.postcode', 'jsonField.address.name'];
  }

  /**
   *
   * @param {Array} l
   * @constructor
   */
  static set LINKS(l) {
    links = l;
  }

  /**
   * @returns {Array}
   */
  static get LINKS() {
    return links;
  }
}

module.exports = Model;
