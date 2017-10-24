/*
© Copyright IBM Corp. 2017
*/

var request = require('request');

var api_key = process.env.API_KEY;
var knowledge_url = process.env.HUB_URL + 'knowledge/';

function KnowledgeObject(type, attributes, id) {
  this.type = type;
  this.attributes = attributes;
  if (id) {
    this.id = id;
  }
}

// Munges the properties that come from knowledge query into a normal dictionary
function getAttributes(properties) {
  var attributes = {};
  Object.keys(properties).forEach(function (key) {
    attributes[key] = properties[key][0]['value']
  });
  return attributes;
}

KnowledgeObject.retrieve = function(objectId) {
  var headers = {
    'api_key': api_key
  };

  var options = {
    url: knowledge_url + 'object/' + objectId,
    method: 'get',
    headers: headers
  };

  return new Promise(function (res, rej) {
    request(options, function(err, response, body) {
      if (err || response.statusCode !== 200) {
        rej(body);
      } else {
        var object = JSON.parse(body)['results'][0];

        var type = object['type'];

        var attributes = object['attributes'];

        res(new KnowledgeObject(type, attributes, objectId));
      }
    });
  });
};

KnowledgeObject.prototype.relations = function(type, direction) {
  var headers = {
    'api_key': api_key
  };

  var options = {
    url: knowledge_url + 'object/' + this.id + '/' + direction,
    method: 'get',
    headers: headers
  };

  if (type) {
    options['qs'] = {
      'relation_type': type
    };
  }

  return new Promise(function (res, rej) {
    request(options, function(err, response, body) {
      if (err || response.statusCode !== 200) {
        rej(body);
      } else {
        var objectData = JSON.parse(body)['results'];

        var objects = [];
        // Yeah, *datum*.  I'm a nerd and couldn't think of something better.
        objectData.forEach(function(objectDatum) {
          var type = objectDatum['type'];
          var attributes = objectDatum['attributes'];
          var id = objectDatum['id'];
          objects.push(new KnowledgeObject(type, attributes, id));
        });

        res(objects);
      }
    });
  });
};

KnowledgeObject.prototype.in = function(type) {
  return this.relations(type, "in");
};

KnowledgeObject.prototype.out = function(type) {
  return this.relations(type, "out");
};

KnowledgeObject.prototype.both = function(type) {
  return this.relations(type, "both");
};

KnowledgeObject.prototype.create = function() {
  if (this.id) {
    throw 'KnowledgeObject already created -- try update()'
  }
  var post_data = {
    'attributes': this.attributes,
    'type': this.type
  };
  var headers = {
    'Content-type': 'application/json',
    'api_key': api_key
  };

  var options = {
    url: knowledge_url + 'object',
    method: 'POST',
    headers: headers,
    body: JSON.stringify(post_data)
  };

  var self = this;
  return new Promise(function (res, rej) {
    request(options, function(err, response, body) {
      if (err || response.statusCode !== 200) {
        console.log('Error creating object (status code ' + response.statusCode + ': ' + err + ' ' + body);
        rej(body);
      } else {
        var result = JSON.parse(body)['results'];
        if (!result){
          console.log("Error creating object:", body);
          rej(body);
        } else {
          self.id = result[0]['id'];
          console.log('Saved object with id: ', self.id, 'and type:', self.type);
          res(body);
        }
      }
    });
  });
};

KnowledgeObject.prototype.update = function() {
  if (!this.id) {
    throw 'No id for this object -- try create()';
  }
  var post_data = {
    'attributes': this.attributes,
    'id': this.id
  };
  var headers = {
    'Content-type': 'application/json',
    'api_key': api_key
  };

  var options = {
    url: knowledge_url + 'object/' + this.id,
    method: 'put',
    headers: headers,
    body: JSON.stringify(post_data)
  };
  var self = this;
  return new Promise(function (res, rej) {
    request(options, function(err, response, body) {
      if (err || response.statusCode !== 200) {
        console.log('Error updating object: ' + err + ' ' + body);
        rej(body);
      } else {
        console.log('Updated object with id: ', self.id, 'and type:', self.type);
        res(body);
      }
    });
  });
};

KnowledgeObject.prototype.delete = function() {
  if (!this.id) {
    throw 'No id for this object -- did you already delete it?';
  }
  var headers = {
    'Content-type': 'application/json',
    'api_key': api_key
  };

  var options = {
    url: knowledge_url + 'object/' + this.id,
    method: 'delete',
    headers: headers,
  };
  var self = this;
  return new Promise(function (res, rej) {
    request(options, function(err, response, body) {
      if (err || response.statusCode !== 200) {
        console.log('Error deleting object: ' + err + ' ' + body);
        rej(body);
      } else {
        console.log('Object', self.id, 'deleted.');
        res(body);
      }
    });
  });
};

module.exports = KnowledgeObject;
