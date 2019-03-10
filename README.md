# adapter-mongo

[![Greenkeeper badge](https://badges.greenkeeper.io/ITcutives/adapter-mongo.svg)](https://greenkeeper.io/) [![Build Status](https://travis-ci.org/ITcutives/adapter-mongo.svg?branch=master)](https://travis-ci.org/ITcutives/adapter-mongo)

## Unsupported

- Like
- Not like


### Values/Changes

The adapter takes care of serialisation/deserialisation defined under

**Supported Types**

- `objectId`


```js
  /**
   * @returns {{}}
   */
  static get SERIALIZED() {
    return {
      "user_id": "objectId",
    };
  }
```

takes

```js
let object = {
  "name": "ashish",
  "user_id": "5bfbad79df84c01b759d96e4"
};
```

and converts to

```js
let object = {
  "name": "ashish",
  "user_id": ObjectId("5bfbad79df84c01b759d96e4")
};
```
