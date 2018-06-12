/**
 * Created by ashish on 02/05/18.
 */
const Boom = require('boom');
const _ = require('lodash');
const {ObjectID} = require('mongodb');
const AbstractAdapter = require('./abstract');

class Adapter extends AbstractAdapter {
  /**
   * @return {string}
   */
  static get DATABASE() {
    return '';
  }

  /**
   * @return {{}}
   */
  static get SERIALIZED() {
    return {};
  }

  /**
   * @return {string}
   */
  static get PLURAL() {
    return '';
  }

  /**
   * @return {string}
   */
  static get TABLE() {
    return '';
  }

  /**
   * @return {Array}
   */
  static get FIELDS() {
    return [];
  }

  /**
   * @return {Array}
   */
  static get LINKS() {
    return [];
  }

  constructor(entity) {
    super();
    if (entity) {
      _.forEach(entity, (v, field) => {
        if (this.constructor.FIELDS.indexOf(field) !== -1) {
          this.properties[field] = v;
        }
      });
    }
  }

  serialise() {

  }

  deserialise() {

  }

  convertKey(id) {
    if (typeof id === 'string' && id.length === 24) {
      return new ObjectID(id);
    }
    return id;
  }

  /**
   *
   * @param conditions
   * @return {*}
   */
  conditionBuilder(conditions) {
    let opr,
      condition,
      temp,
      isFirst,
      sampleCondition,
      operators,
      compiled,
      where;
    isFirst = true;
    sampleCondition = {
      field: '',
      operator: '=',
      value: '',
      condition: '$and'
    };
    operators = {
      '=': '$eq',
      '<': '$lt',
      '>': '$gt',
      '<=': '$lte',
      '>=': '$gte',
      '<>': '$ne',
      '!=': '$ne',
      // 'like': ,
      // 'not like',
      // 'ilike',
      'regexp': '$regex',
      'between': 'between',
      'in': '$in',
      'not in': '$nin'
    };

    compiled = {};

    _.forEach(conditions, (cond, key) => {
      // for key-value pairs
      if (typeof cond !== 'object' || cond === null) {
        temp = cond;
        cond = _.clone(sampleCondition);
        cond.field = key;
        cond.value = temp;
      }

      // Operator
      opr = '=';
      if (cond.operator && operators[cond.operator]) {
        opr = cond.operator;
      }
      opr = operators[opr];
      // condition
      condition = '$and';
      if (cond.condition && !_.isEmpty(cond.condition)) {
        condition = cond.condition.toLocaleLowerCase() === 'or' ? '$or' : '$and';
      }

      where = {[cond.field]: {}};
      switch (opr) {
        case 'between':
          where[cond.field] = {
            '$gte': cond.value[0],
            '$lte': cond.value[1]
          };
          break;
        case '$regex':
          where[cond.field] = {
            [opr]: new RegExp(cond.value)
          };
          break;
        case '$eq':
          where[cond.field] = cond.value;
          break;
        case '$in':
        case '$nin':
          if (!Array.isArray(cond.value)) {
            cond.value = [cond.value];
          }
          // falls through
        default:
          where[cond.field][opr] = cond.value;
      }
      if (isFirst === true) {
        compiled = where;
      } else {
        compiled = {
          [condition]: [where, compiled]
        };
      }
      isFirst = false;
    });
    return compiled;
  }

  /**
   *
   * @param condition
   * @param select
   * @param order
   * @param from
   * @param limit
   * @return {*|promise}
   */
  SELECT(condition, select, order, from, limit) {
    throw Boom.badImplementation('[adapter] `SELECT` method not implemented');
  }

  /**
   *
   * @param values
   * @return {*|promise}
   */
  INSERT(values) {
    throw Boom.badImplementation('[adapter] `INSERT` method not implemented');
  }

  /**
   *
   * @param changes
   * @param condition
   * @return {*|promise}
   */
  UPDATE(changes, condition) {
    throw Boom.badImplementation('[adapter] `UPDATE` method not implemented');
  }

  /**
   *
   * @param condition
   * @return {*|promise}
   */
  DELETE(condition) {
    throw Boom.badImplementation('[adapter] `DELETE` method not implemented');
  }
}

module.exports = Adapter;
