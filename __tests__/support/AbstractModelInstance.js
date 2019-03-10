/**
 * Created by ashish on 17/5/17.
 */
const path = require('path');
const Model = require('../models/model');

describe('AbstractModelInstance - MongoDB', () => {
  describe('constructor', () => {
    it('should leave properties as empty object if nothing is provided', () => {
      const model = new Model();
      expect(model.properties).toEqual({});
    });

    it('should set properties that matches field names', () => {
      const model = new Model({ a: 1, b: 2, c: 3 });
      expect(model.properties).toEqual({ a: 1, b: 2 });
    });

    it('should set _id field as id if id field is not provided', () => {
      const model = new Model({ a: 1, _id: 2 });
      expect(model.properties).toEqual({ a: 1, id: 2 });
    });

    it('should not use _id field if id field is also provided', () => {
      const model = new Model({ a: 1, _id: 2, id: 3 });
      expect(model.properties).toEqual({ a: 1, id: 3 });
    });

    it('should set nested properties (json-object) correctly', () => {
      const model = new Model({ a: 1, b: { c: 2 } });
      expect(model.properties).toEqual({ a: 1, b: { c: 2 } });
    });
  });

  describe('getTableName', () => {
    let model = null;

    beforeEach(() => {
      model = new Model({});
    });

    it('should only return table', () => {
      Model.DATABASE = '';
      Model.TABLE = 'table1';
      expect(model.getTableName()).toBe('table1');
    });
  });

  describe('setOriginal', () => {
    let model = null;

    beforeEach(() => {
      model = new Model({});
    });

    it("should not set original if object type doesn't match", () => {
      model.setOriginal({ a: 1 });
      expect(model.original).toBe(undefined);
    });

    it("should set original if object type doesn't match", () => {
      const obj = new Model({ a: 1 });
      model.setOriginal(obj);
      expect(model.original).toBe(obj);
    });
  });

  describe('set', () => {
    let model = null;

    beforeEach(() => {
      model = new Model({});
    });

    it('should not set value if field is invalid', () => {
      model.set('c', 10);
      expect(model.properties).toEqual({});
    });

    it('should set value if field is valid', () => {
      model.set('a', 10);
      expect(model.properties.a).toBe(10);
    });

    it('should set `properties` as empty object and set property', () => {
      model.properties = undefined;
      model.set('a', 10);
      expect(model.properties.a).toBe(10);
    });
  });

  describe('get', () => {
    let model = null;

    beforeEach(() => {
      model = new Model({ a: 10 });
    });

    it('should return undefined for invalid field name', () => {
      expect(model.get('c')).toBe(undefined);
    });

    it('should return field value for valid', () => {
      expect(model.get('a')).toBe(10);
    });
  });

  describe('conditionBuilder', () => {
    let mysql;
    const conditions = [
      {
        description: 'should build aggregate query with $lookup with related table',
        input: [{
          field: 'id',
          operator: 'in',
          value: {
            class: require('../models/relatives'),
            select: 'a_id',
            condition: { a_id: 'abc' },
          },
        }],
        output: [
          {
            $lookup: {
              from: 'related',
              let: {
                id: '$_id',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            '$a_id',
                            '$$id',
                          ],
                        },
                      ],
                    },
                  },
                },
              ],
              as: 'links.related',
            },
          },
          {
            $match: {
              'links.related': {
                $elemMatch: {
                  a_id: 'abc',
                },
              },
            },
          },
          {
            $addFields: {
              'links.related': {
                $map: {
                  input: '$links.related',
                  as: 'el',
                  in: '$$el._id',
                },
              },
            },
          },
        ]
        ,
      },
      {
        description: 'should build aggregate query with $lookup with self',
        input: [{
          field: 'id',
          operator: 'in',
          value: {
            select: 'a_id',
            condition: { a_id: 'abc' },
          },
        }],
        output: [
          {
            $lookup: {
              from: 'table1',
              let: {
                id: '$_id',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            '$a_id',
                            '$$id',
                          ],
                        },
                      ],
                    },
                  },
                },
              ],
              as: 'links.table1',
            },
          },
          {
            $match: {
              'links.table1': {
                $elemMatch: {
                  a_id: 'abc',
                },
              },
            },
          },
          {
            $addFields: {
              'links.table1': {
                $map: {
                  input: '$links.table1',
                  as: 'el',
                  in: '$$el._id',
                },
              },
            },
          },
        ]
        ,
      },
    ];

    beforeEach(() => {
      Model.TABLE = 'table1';
      mysql = new Model({});
    });

    afterEach(() => {
      Model.TABLE = undefined;
    });

    conditions.forEach((condition) => {
      it(condition.description, () => {
        expect(mysql.conditionBuilder(condition.input)).toEqual(condition.output);
      });
    });
  });

  describe('remove', () => {
    let model = null;

    it('should remove valid field', () => {
      model = new Model({ a: 10, b: 20 });
      model.remove('a');
      expect(model.properties).toEqual({ b: 20 });
    });

    it('should return undefined for invalid field name', () => {
      model = new Model({ a: 10 });
      model.remove('c');
      expect(model.properties).toEqual({ a: 10 });
    });

    it('should return undefined if property is not set', () => {
      model = new Model();
      delete model.properties;
      model.remove('c');
      expect(model.properties).toBe(undefined);
    });
  });

  describe('query', () => {
  });

  describe('SELECT', () => {
  });

  describe('INSERT', () => {
  });

  describe('UPDATE', () => {
  });

  describe('serialise', () => {
  });

  describe('deserialise', () => {
  });

  describe('REVIEW: FINDLINKS', () => {
    let mysql;
    const output = [{ user_id: 1 }, { user_id: 2 }];

    beforeEach(() => {
      mysql = new Model({});
    });

    it('should return raw results', async () => {
      mysql.query = jest.fn().mockResolvedValue(output);
      const result = await mysql.FINDLINKS('user_role', { role_id: 1 }, 'user_id');
      expect(mysql.query).toHaveBeenCalledWith('user_role', { role_id: 1 }, { user_id: 1 });
      expect(result).toEqual(output);
    });

    it('should forward error thrown by rawQuery', async () => {
      const error = new Error('mysql findlinks error');
      mysql.query = jest.fn().mockRejectedValue(error);
      expect(mysql.FINDLINKS('user_role', { user_id: 1 }, 'role_id')).rejects.toEqual(error);
      expect(mysql.query).toHaveBeenCalledWith('user_role', { user_id: 1 }, { role_id: 1 });
    });
  });

  describe('toLink', () => {
    let mysql;
    let Related;

    beforeEach(() => {
      mysql = new Model({
        id: 1,
        name: 'test',
        plan_id: '3',
      });
      Model.LINKS = [
        {
          PLURAL: 'gateways',
          LINK: 'gateway_id',
          CHILD: 'organisation_id',
          JOIN: 'credit',
          TYPE: 'MTOM',
          CANMODIFY: true,
        },
        {
          PLURAL: 'users',
          LINK: 'user_id',
          CHILD: 'organisation_id',
          JOIN: 'permission',
          TYPE: 'MTOM',
          CANMODIFY: true,
        },
        {
          PLURAL: 'relatives',
          LINK: 'organisation_id',
          TYPE: '1TOM',
          CANMODIFY: false,
        },
        {
          PLURAL: 'plans',
          LINK: 'plan_id',
          TYPE: '1TO1',
          CANMODIFY: false,
        },
      ];
      Related = require('../models/relatives');
      Related.prototype.SELECT = jest.fn().mockResolvedValue([new Related({ id: 300 })]);
      mysql.FINDLINKS = jest.fn().mockRejectedValue(new Error('BAD Table'));
    });

    afterEach(() => {
      Model.LINKS = [];
    });

    it('should correctly process link details and handle errors when requested', async () => {
      const result = await mysql.toLink(['relatives', 'plans', 'gateways'], path.join(__dirname, '..'));
      expect(Related.prototype.SELECT).toHaveBeenCalled();
      expect(mysql.FINDLINKS).toHaveBeenCalled();
      expect(result).toEqual({
        id: 1,
        name: 'test',
        links: {
          plans: 3,
          relatives: [300],
        },
      });
    });

    it('should not do anything if link fields argument is empty', async () => {
      const result = await mysql.toLink([], path.join(__dirname, '..'));
      expect(Related.prototype.SELECT).not.toHaveBeenCalled();
      expect(mysql.FINDLINKS).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: 1,
        name: 'test',
        plan_id: '3',
        links: {},
      });
    });
  });

  describe('fromLink', () => {
    let object;

    beforeEach(() => {
      object = {
        id: 1,
        name: 'test',
        links: {
          plans: 3,
          relatives: [300],
        },
      };
      Model.LINKS = [
        {
          PLURAL: 'gateways',
          LINK: 'gateway_id',
          CHILD: 'organisation_id',
          JOIN: 'credit',
          TYPE: 'MTOM',
          CANMODIFY: true,
        },
        {
          PLURAL: 'users',
          LINK: 'user_id',
          CHILD: 'organisation_id',
          JOIN: 'permission',
          TYPE: 'MTOM',
          CANMODIFY: true,
        },
        {
          PLURAL: 'relatives',
          LINK: 'organisation_id',
          TYPE: '1TOM',
          CANMODIFY: false,
        },
        {
          PLURAL: 'plans',
          LINK: 'plan_id',
          TYPE: '1TO1',
          CANMODIFY: false,
        },
      ];
    });

    afterEach(() => {
      Model.LINKS = [];
    });

    it('should create class instance with correct fields populated from links object', async () => {
      const expectation = new Model({ id: 1, name: 'test', plan_id: 3 });
      expectation.relationships = {
        plans: 3,
        relatives: [300],
      };
      const result = await Model.fromLink(Model, object);
      expect(result).toEqual(expectation);
    });

    it('should just create class instance without links populated if there is no links field', async () => {
      Model.LINKS = [];
      const expectation = new Model({ id: 1, name: 'test' });
      expectation.relationships = {
        plans: 3,
        relatives: [300],
      };
      const result = await Model.fromLink(Model, object);
      expect(result).toEqual(expectation);
    });
  });
});
