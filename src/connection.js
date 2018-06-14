/**
 * Created by ashish on 02/05/18.
 */
const MongoClient = require('mongodb').MongoClient;
const AbstractConnection = require('./abstractConnection');

class Connection extends AbstractConnection {
  openConnection() {
    if (!this.connection) {
      return MongoClient.connect(this.config.url)
        .then((client) => {
          this.connection = client.db(this.config.db);
          return this.connection;
        });
    }
    return Promise.resolve(this.connection);
  }

  closeConnection() {
    const conn = this.connection;
    if (!conn) {
      return Promise.resolve();
    }
    return conn.close().then(() => (this.connection = undefined));
  }
}

module.exports = Connection;
