/**
 * Created by ashish on 02/05/18.
 */
const { MongoClient } = require('mongodb');
const AbstractConnection = require('@itcutives/adapter-memory/src/abstractConnection');

class Connection extends AbstractConnection {
  static get TYPE() {
    return 'MONGO';
  }

  openConnection() {
    if (!this.connection) {
      return MongoClient.connect(this.config.url)
        .then((client) => {
          this.client = client;
          this.connection = client.db(this.config.db);
          return this.connection;
        });
    }
    return Promise.resolve(this.connection);
  }

  closeConnection() {
    const conn = this.client;
    if (!conn) {
      return Promise.resolve();
    }
    return conn.close()
      .then(() => {
        this.client = undefined;
        this.connection = undefined;
      });
  }
}

module.exports = Connection;
