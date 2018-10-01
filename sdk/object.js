/*
 © Copyright IBM Corp. 2017
 */

const request = require('request');

const API_KEY = process.env.API_KEY;
const KNOWLEDGE_URL = process.env.HUB_URL + 'knowledge/';

const headers = {
  'Content-type': 'application/json',
  'api_key': API_KEY
};

class KnowledgeObject {
  /**
   *
   * @param {string} type
   * @param {Object} attributes
   * @param {string} id
   */
  constructor(type, attributes, id) {
    this.type = type;
    this.attributes = attributes;
    if (id) {
      this.id = id;
    }
  }

  /**
   *
   * @param {string} objectId
   */
  static retrieve(objectId) {
    const options = {
      url: `${KNOWLEDGE_URL}object/${objectId}`,
      method: 'GET',
      headers
    }

    return new Promise((resolve, reject) => {
      request(options, (err, response, body) => {
        if (err || response.statusCode !== 200) {
          return reject(body);
        }

        const kObject = JSON.parse(body).results[0];
        const type = kObject.type;
        const attributes = kObject.attributes;

        return resolve(new KnowledgeObject(type, attributes, objectId));
      });
    });
  };

  /**
   *
   * @param {string} type
   * @param {string} direction
   */
  relations(type, direction) {
    let options = {
      url: `${KNOWLEDGE_URL}object/${this.id}/${direction}`,
      method: 'GET',
      headers
    }

    if (type) {
      options.qs = {
        relation_type: type
      };
    }

    return new Promise((resolve, reject) => {
      request(options, (err, response, body) => {
        if (err || response.statusCode !== 200) {
          return reject(body);
        }

        const objectsData = JSON.parse(body).results;
        let objects = [];
        objectsData.forEach(objectData => {
          const type = objectData.type;
          const attributes = objectData.attributes;
          const id = objectData.id;
          objects.push(new KnowledgeObject(type, attributes, id));
        });
        return resolve(objects);
      });
    });
  };

  /**
   *
   * @param {string} type
   */
  in (type) {
    return this.relations(type, 'in');
  };

  /**
   *
   * @param {string} type
   */
  out(type) {
    return this.relations(type, 'out');
  };

  /**
   *
   * @param {string} type
   */
  both(type) {
    return this.relations(type, 'both');
  };


  create() {
    if (this.id) {
      throw {
        name: 'AlreadyCreated',
        message: 'KnowledgeObject already created -- try update()'
      };
    }

    const postData = {
      attributes: this.attributes,
      type: this.type
    };

    const options = {
      url: `${KNOWLEDGE_URL}object`,
      method: 'POST',
      headers,
      json: postData
    };

    return new Promise((resolve, reject) => {
      request(options, (err, response, body) => {
        if (err || (response && response.statusCode !== 200)) {
          console.log(`Error creating object ${err} ${body}`);
          if (response.statusCode) {
              console.log(`Status code ${response.statusCode}`);
          }
          return reject(body);
        }

        const result = body.results;
        if (!result) {
          console.log(`error creating object: ${body}`);
          return reject(body);
        }

        this.id = result[0].id;
        console.log(`Saved object with id: ${this.id} and type ${this.type}`);
        return resolve(body);
      });
    });
  };

  update() {
    if (!this.id) {
      throw {
        name: 'NotCreated',
        message: 'KnowledgeObject has no id -- try create()'
      };
    }

    const postData = {
      attributes: this.attributes,
      id: this.id
    };

    const options = {
      url: `${KNOWLEDGE_URL}object/${this.id}`,
      method: 'PUT',
      headers,
      json: postData
    }

    return new Promise((resolve, reject) => {
      request(options, (err, response, body) => {
        if (err || (response && response.statusCode !== 200)) {
          console.log(`Error creating object ${err} ${body}`);
          if (response.statusCode) {
              console.log(`Status code ${response.statusCode}`);
          }
          return reject(body);
        }

        console.log(`Updated object with id ${this.id} and type ${this.type}`);
        return resolve(body);
      });
    });
  };

  delete() {
    if (!this.id) {
      throw {
        name: 'AlreadyDeleted',
        message: 'No id for this object -- did you already delte it?'
      };
    }

    const options = {
      url: `${KNOWLEDGE_URL}object/${this.id}`,
      method: 'DELETE',
      headers
    };

    return new Promise((resolve, reject) => {
      request(options, (err, response, body) => {
        if (err || (response && response.statusCode !== 200)) {
          console.log(`Error creating object ${err} ${body}`);
          if (response.statusCode) {
              console.log(`Status code ${response.statusCode}`);
          }
          return reject(body);
        }
        console.log(`Object ${this.id}(${this.type}) deleted`);
        return resolve(body);
      });
    });
  };
}

module.exports = KnowledgeObject;