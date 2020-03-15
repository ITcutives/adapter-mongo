const { ObjectID } = require('mongodb');
const Mongo = require('../src/adapter');

describe('adapter', () => {
  describe('getSelectFields', () => {
    it('should place tilde around field names', (done) => {
      const fields = [
        'a',
        'b',
        'c',
      ];
      expect(Mongo.getSelectFields(fields)).toEqual({ a: 1, b: 1, c: 1 });
      done();
    });

    it('should handle empty field list correctly', (done) => {
      const fields = [];
      expect(Mongo.getSelectFields(fields)).toEqual({});
      done();
    });

    it('should handle json fields correctly', (done) => {
      const fields = 'a.b.c';
      expect(Mongo.getSelectFields(fields)).toEqual({ 'a.b.c': 1 });
      done();
    });

    it('should return undefined when all fields are requested', (done) => {
      const fields = '*';
      expect(Mongo.getSelectFields(fields)).toEqual(undefined);
      done();
    });

    it('should return undefined when all fields are requested (default value of fields argument)', (done) => {
      const fields = undefined;
      expect(Mongo.getSelectFields(fields)).toEqual(undefined);
      done();
    });
  });

  describe('getOrderByFields', () => {
    it('should handle simple array', (done) => {
      const order = ['a', 'b', 'c'];
      expect(Mongo.getOrderByFields(order)).toEqual({ a: 1, b: 1, c: 1 });
      done();
    });

    it('should handle object properly', (done) => {
      const order = { a: 'asc', b: 'desc' };
      expect(Mongo.getOrderByFields(order)).toEqual({ a: 1, b: -1 });
      done();
    });

    it('should handle simple value', (done) => {
      const order = 'a';
      expect(Mongo.getOrderByFields(order)).toEqual({ a: 1 });
      done();
    });

    it('should properly handle empty (undefined) value', (done) => {
      expect(Mongo.getOrderByFields()).toEqual({});
      done();
    });

    it('should properly handle empty (undefined) value', (done) => {
      const order = { a: '', b: 'desc' };
      expect(Mongo.getOrderByFields(order)).toEqual({ a: 1, b: -1 });
      done();
    });

    it('should properly handle empty (empty array) value', (done) => {
      const order = [];
      expect(Mongo.getOrderByFields(order)).toEqual({});
      done();
    });

    it('should properly handle negative/positive notation for ascending/descending', (done) => {
      const order = ['a', '-b'];
      expect(Mongo.getOrderByFields(order)).toEqual({ a: 1, b: -1 });
      done();
    });
  });

  describe('conditionBuilder', () => {
    let mongo;
    mongo = null;
    const conditions = [
      {
        input: {
          a: 1,
          b: 2,
          c: {
            field: 'c',
            operator: 'in',
            value: [3, '4', 'x'],
          },
        },
        output: [{
          $match: {
            $and: [
              { c: { $in: [3, '4', 'x'] } },
              {
                $and: [
                  { b: 2 },
                  { a: 1 },
                ],
              },
            ],
          },
        }],
      },
      {
        input: {
          a: 1,
          'b.c': 2,
          c: {
            field: 'c.d',
            operator: 'in',
            value: [3, '4', 'x'],
          },
        },
        output: [{
          $match: {
            $and: [
              { 'c.d': { $in: [3, '4', 'x'] } },
              {
                $and: [
                  { 'b.c': 2 },
                  { a: 1 },
                ],
              },
            ],
          },
        }],
      },
      {
        input: {
          a: 1,
          b: 2,
          c: {
            field: 'c',
            operator: 'in',
            value: 'a',
          },
        },
        output: [{
          $match: {
            $and: [
              { c: { $in: ['a'] } },
              {
                $and: [
                  { b: 2 },
                  { a: 1 },
                ],
              },
            ],
          },
        }],
      },
      {
        input: {
          a: 1,
          b: 2,
          c: {
            field: 'c',
            operator: 'not in',
            value: 'a',
          },
        },
        output: [{
          $match: {
            $and: [
              { c: { $nin: ['a'] } },
              {
                $and: [
                  { b: 2 },
                  { a: 1 },
                ],
              },
            ],
          },
        }],
      },
      {
        input: [
          {
            field: 'a',
            value: 1,
          },
          {
            field: 'b',
            operator: '!=',
            value: '2',
            condition: 'OR',
          },
        ],
        output: [{
          $match: {
            $or: [
              { b: { $ne: '2' } },
              { a: 1 },
            ],
          },
        }],
      },
      {
        input: [
          {
            field: 'c',
            operator: '=',
            value: null,
          },
          {
            field: 'd',
            operator: '!=',
            value: null,
            condition: 'AND',
          },
        ],
        output: [{
          $match: {
            $and: [
              { d: { $ne: null } },
              { c: null },
            ],
          },
        }],
      },
      {
        input: [
          {
            field: 'x',
            operator: 'between',
            value: [10, 20],
          },
          {
            field: 'y',
            operator: 'regexp',
            value: '/find/',
            condition: 'OR',
          },
        ],
        output: [{
          $match: {
            $or: [
              { y: { $regex: new RegExp('/find/') } },
              { x: { $gte: 10, $lte: 20 } },
            ],
          },
        }],
      },
      {
        input: undefined,
        output: [],
      },
    ];

    beforeEach(() => {
      mongo = new Mongo({});
    });

    conditions.forEach((condition) => {
      it(`should build - ${JSON.stringify(condition.output)}`, () => {
        expect(mongo.conditionBuilder(condition.input)).toEqual(condition.output);
      });
    });
  });

  describe('setDatabase', () => {
    let model;

    beforeEach(() => {
      model = new Mongo({});
    });

    it('should set correct database', () => {
      model.setDatabase('mysql_0001_db');
      expect(model.database).toBe('mysql_0001_db');
    });
  });

  describe('getDatabase', () => {
    let model;

    beforeEach(() => {
      model = new Mongo({});
    });

    it('should get correct database', () => {
      model.database = 'mysql_0001_db';
      expect(model.getDatabase()).toBe('mysql_0001_db');
    });
  });

  describe('SERIALIZED', () => {
    it('should be equal to empty object', () => {
      expect(Mongo.SERIALIZED).toEqual({});
    });
  });

  describe('PLURAL', () => {
    it('should be empty string', () => {
      expect(Mongo.PLURAL).toEqual('');
    });
  });

  describe('TABLE', () => {
    it('should be empty string', () => {
      expect(Mongo.TABLE).toEqual('');
    });
  });

  describe('FIELDS', () => {
    it('should be empty array', () => {
      expect(Mongo.FIELDS).toEqual([]);
    });
  });

  describe('LINKS', () => {
    it('should be empty array', () => {
      expect(Mongo.LINKS).toEqual([]);
    });
  });

  describe('isIdField', () => {
    it('should return true if field itself is called `id`', () => {
      expect(Mongo.isIdField('id')).toEqual(true);
    });

    it('should return true if field has `_id` string', () => {
      expect(Mongo.isIdField('user_id')).toEqual(true);
    });

    it('should return false if field is not `id` or does not contain `_id`', () => {
      expect(Mongo.isIdField('address')).toEqual(false);
    });
  });

  describe('fixIdField', () => {
    it('should rename field `_id` to `id`', () => {
      expect(Mongo.fixIdField('id')).toBe('_id');
    });

    it('should not rename field `address` to `id`', () => {
      expect(Mongo.fixIdField('address')).toBe('address');
    });
  });

  describe('convertKey', () => {
    it('should covert array of ids to objectId instances', () => {
      const ids = [
        '5d7cfb7e3725c1ab56b75522',
        '5d7cfb7e3725c1ab56b75523',
        '5d7cfb7e3725c1ab56b75524',
      ];
      expect(Mongo.convertKey(ids)).toEqual(ids.map((i) => new ObjectID(i)));
    });

    it('should covert string id to ObjectId', () => {
      const id = '5d7cfb7e3725c1ab56b75522';

      expect(Mongo.convertKey(id)).toEqual(new ObjectID(id));
    });

    describe('non ObjectId', () => {
      it('should return id as is if id is not ObjectId string', () => {
        const id = 'abcd';
        expect(Mongo.convertKey(id)).toEqual('abcd');
      });

      it('should return id as is if id is not ObjectId string', () => {
        const id = 10;
        expect(Mongo.convertKey(id)).toEqual(10);
      });
    });
  });
});
