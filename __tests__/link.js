/**
 * Created by ashish on 11/03/19.
 */
const path = require('path');
const Link = require('../src/link');

const db = {};

describe('link', () => {
  describe('ALLOWED_LINKS', () => {
    it('should return static array value', () => {
      expect(Link.ALLOWED_LINKS).toEqual(['MTOM', '1TOM', '1TO1']);
    });
  });

  describe('constructor', () => {
    it('should assign all the properties provided in links attribute', () => {
      const prop = {
        PLURAL: 'organisations',
        LINK: 'organisation_id',
        TYPE: '1TO1',
        CANMODIFY: false,
      };
      const link = new Link(db, prop);
      expect(link.db).toEqual(db);
      expect(link.plural).toEqual(prop.PLURAL);
    });
  });

  describe('toLink', () => {
    let link;

    beforeEach(() => {
      link = null;
    });

    it("should call toMTOM when link type is 'MTOM'", async () => {
      link = new Link(db, {
        PLURAL: 'organisations',
        LINK: 'organisation_id',
        CHILD: 'gateway_id',
        JOIN: 'credit',
        TYPE: 'MTOM',
        CANMODIFY: true,
      });
      link.toMTOM = jest.fn().mockResolvedValue();
      await link.toLink();
      expect(link.toMTOM).toHaveBeenCalled();
    });

    it("should call to1TOM when link type is '1TOM'", async () => {
      link = new Link(db, {
        PLURAL: 'webservices',
        LINK: 'organisation_id',
        TYPE: '1TOM',
        CANMODIFY: false,
      });

      link.to1TOM = jest.fn().mockResolvedValue();
      await link.toLink();
      expect(link.to1TOM).toHaveBeenCalled();
    });

    it("should call to1TO1 when link type is '1TO1'", async () => {
      link = new Link(db, {
        PLURAL: 'organisations',
        LINK: 'organisation_id',
        TYPE: '1TO1',
        CANMODIFY: false,
      });
      link.to1TO1 = jest.fn().mockResolvedValue();
      await link.toLink();
      expect(link.to1TO1).toHaveBeenCalled();
    });

    it('should return object as is when link type is unknown', async () => {
      link = new Link(db, {
        PLURAL: 'organisations',
        LINK: 'organisation_id',
        CANMODIFY: false,
      });
      link.to1TO1 = jest.fn().mockResolvedValue();
      await link.toLink();
      expect(link.to1TO1).not.toHaveBeenCalled();
    });
  });

  describe('fromLink', () => {
    let link;
    let object;

    beforeEach(() => {
      object = {
        id: 1,
        name: 'test',
        links: {
          organisations: 11,
        },
      };
    });

    it('should find and assign links if available', async () => {
      link = new Link(db, {
        PLURAL: 'organisations',
        LINK: 'organisation_id',
        TYPE: '1TO1',
        CANMODIFY: false,
      });
      const result = await link.fromLink(object);
      expect(result).toEqual({
        id: 1,
        name: 'test',
        organisation_id: 11,
        links: {
          organisations: 11,
        },
      });
    });

    it('should leave object as is if the link type is not 1TO1', async () => {
      link = new Link(db, {
        PLURAL: 'organisations',
        LINK: 'organisation_id',
        TYPE: '1TOM',
        CANMODIFY: false,
      });
      const result = await link.fromLink(object);
      expect(result).toEqual(object);
    });
  });

  describe('toMTOM', () => {
    let link;
    let object;

    beforeEach(() => {
      object = {
        id: 1,
        name: 'organisation',
        links: {},
      };
    });

    it('should pick values from relationship object if value is already assigned', async () => {
      link = new Link(db, {
        PLURAL: 'users',
        LINK: 'user_id',
        CHILD: 'organisation_id',
        JOIN: 'permission',
        TYPE: 'MTOM',
        CANMODIFY: true,
      }, {
        permission: ['ashish', 'manish'],
      });
      const result = await link.toMTOM(object);
      expect(result).toEqual({
        id: 1,
        name: 'organisation',
        links: {
          users: ['ashish', 'manish'],
        },
      });
    });

    it('should call findLinks with join table and query database', async () => {
      db.FINDLINKS = jest.fn().mockResolvedValue([{ user_id: 'riddhi' }]);
      link = new Link(db, {
        PLURAL: 'users',
        LINK: 'user_id',
        CHILD: 'organisation_id',
        JOIN: 'permission',
        TYPE: 'MTOM',
        CANMODIFY: true,
      });
      const result = await link.toMTOM(object);
      expect(result).toEqual({
        id: 1,
        name: 'organisation',
        links: {
          users: ['riddhi'],
        },
      });
    });
  });

  describe('to1TOM', () => {
    let link;
    let object;

    beforeEach(() => {
      object = {
        id: 1,
        name: 'organisation',
        links: {},
      };
    });

    it('should return the value from relationship object if it is assigned', async () => {
      link = new Link(db, {
        PLURAL: 'relatives',
        LINK: 'organisation_id',
        TYPE: '1TOM',
        CANMODIFY: false,
      }, {
        related: [100, 200],
      });
      const result = await link.to1TOM(object, path.join('../__tests__'));
      expect(result).toEqual({
        id: 1,
        name: 'organisation',
        links: {
          relatives: [100, 200],
        },
      });
    });

    it('should query join table to fetch link details', async () => {
      link = new Link(db, {
        PLURAL: 'relatives',
        LINK: 'organisation_id',
        TYPE: '1TOM',
        CANMODIFY: false,
      });
      const Relative = require('./models/relatives');
      Relative.prototype.SELECT = jest.fn().mockResolvedValue([new Relative({ id: 100 })]);
      const result = await link.to1TOM(object, path.join('../__tests__'));
      expect(result).toEqual({
        id: 1,
        name: 'organisation',
        links: {
          relatives: [100],
        },
      });
    });
  });

  describe('to1TO1', () => {
    let link;
    let object;

    beforeEach(() => {
      object = {
        id: 1,
        name: 'test',
        address_id: 'unique-id-1022',
        organisation_id: 11,
        plan_id: '3',
        links: {},
      };
    });

    it('should move field value under links if found', async () => {
      link = new Link(db, {
        PLURAL: 'organisations',
        LINK: 'organisation_id',
        TYPE: '1TO1',
        CANMODIFY: false,
      });
      const result = await link.to1TO1(object);
      expect(result).toEqual({
        id: 1,
        name: 'test',
        plan_id: '3',
        address_id: 'unique-id-1022',
        links: {
          organisations: 11,
        },
      });
    });

    it('should not make any changes if link field is not assigned', async () => {
      link = new Link(db, {
        PLURAL: 'connections',
        LINK: 'connection_id',
        TYPE: '1TO1',
        CANMODIFY: false,
      });
      const result = await link.to1TO1(object);
      expect(result).toEqual({
        id: 1,
        name: 'test',
        plan_id: '3',
        organisation_id: 11,
        address_id: 'unique-id-1022',
        links: {},
      });
    });

    it('should convert the value to integer if it is a number in string format', async () => {
      link = new Link(db, {
        PLURAL: 'plans',
        LINK: 'plan_id',
        TYPE: '1TO1',
        CANMODIFY: false,
      });
      const result = await link.to1TO1(object);
      expect(result).toEqual({
        id: 1,
        name: 'test',
        address_id: 'unique-id-1022',
        organisation_id: 11,
        links: {
          plans: 3,
        },
      });
    });

    it('should not convert the value to integer if it is a string', async () => {
      link = new Link(db, {
        PLURAL: 'addresses',
        LINK: 'address_id',
        TYPE: '1TO1',
        CANMODIFY: false,
      });
      const result = await link.to1TO1(object);
      expect(result).toEqual({
        id: 1,
        name: 'test',
        organisation_id: 11,
        plan_id: '3',
        links: {
          addresses: 'unique-id-1022',
        },
      });
    });
  });

  describe('from1TO1', () => {
    let link;
    let object;

    beforeEach(() => {
      link = new Link(db, {
        PLURAL: 'organisations',
        LINK: 'organisation_id',
        TYPE: '1TO1',
        CANMODIFY: false,
      });
      object = {
        id: 1,
        name: 'test',
        links: {
          organisations: 11,
        },
      };
    });

    it('should find and assign links if available', async () => {
      const result = await link.from1TO1(object);
      expect(result).toEqual({
        id: 1,
        name: 'test',
        organisation_id: 11,
        links: {
          organisations: 11,
        },
      });
    });
  });
});
