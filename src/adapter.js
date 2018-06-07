/**
 * Created by ashish on 02/05/18.
 */
const Boom = require("boom");
const _ = require("lodash");
const {ObjectID} = require("mongodb");
const AbstractAdapter = require("./abstract");

class Adapter extends AbstractAdapter {
  /**
   * @return {string}
   */
  static get DATABASE() {
    return "";
  }

  /**
   * @returns {{}}
   */
  static get SERIALIZED() {
    return {};
  }

  /**
   * @returns {string}
   */
  static get PLURAL() {
    return "";
  }

  /**
   * @returns {string}
   */
  static get TABLE() {
    return "";
  }

  /**
   * @returns {Array}
   */
  static get FIELDS() {
    return [];
  }

  /**
   * @returns {Array}
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
   * @returns {*}
   */
  conditionBuilder(conditions) {
    let where = "",
      args = [],
      opr,
      condition,
      placeHolder,
      addToArgs,
      temp,
      isFirst = true,
      sampleCondition = {
        "field": "",
        "operator": "=",
        "value": "",
        "condition": "AND"
      },
      operators = {
        "=": "$eq",
        "<": "$lt",
        ">": "$gt",
        "<=": "$lte",
        ">=": "$gte",
        "<>": "$ne",
        "!=": "$ne",
        // "like": ,
        // "not like",
        // "between",
        // "ilike",
        "regexp": "$regex",
        "in": "$in",
        "not in": "$nin"
      };

    let compiled = {};
    _.forEach(conditions, (cond, key) => {
      //for key-value pairs
      if (typeof cond !== "object" || cond === null) {
        temp = cond;
        cond = _.clone(sampleCondition);
        cond.field = key;
        cond.value = temp;
      }

      //Operator
      opr = "=";
      if (cond.operator && operators[cond.operator]) {
        opr = cond.operator;
      }
      opr = operators[opr];
      //condition
      condition = "AND";
      if (cond.condition && !_.isEmpty(cond.condition)) {
        condition = cond.condition;
      }

      let where = {};
      where[cond.field] = {};
      switch(opr) {
      //   case "$in":
      //   case "$nin":
        case "$eq":
          where[cond.field] = cond.value;
          break;
        default:
          where[cond.field][opr] = cond.value;
      }
      switch(condition) {
        case 'OR':
          if (!compiled['$or']) {
            compiled['$or'] = [];
          }
          compiled['$or'].push(where);
          break;
        case 'AND':
          if (!compiled['$and']) {
            compiled['$and'] = [];
          }
          compiled['$and'].push(where);
          break;
      }
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
   * @returns {*|promise}
   */
  SELECT(condition, select, order, from, limit) {
    throw Boom.badImplementation("[adapter] `SELECT` method not implemented");
  }

  /**
   *
   * @param values
   * @returns {*|promise}
   */
  INSERT(values) {
    throw Boom.badImplementation("[adapter] `INSERT` method not implemented");
  }

  /**
   *
   * @param changes
   * @param condition
   * @returns {*|promise}
   */
  UPDATE(changes, condition) {
    throw Boom.badImplementation("[adapter] `UPDATE` method not implemented");
  }

  /**
   *
   * @param condition
   * @returns {*|promise}
   */
  DELETE(condition) {
    throw Boom.badImplementation("[adapter] `DELETE` method not implemented");
  }

}

module.exports = Adapter;
