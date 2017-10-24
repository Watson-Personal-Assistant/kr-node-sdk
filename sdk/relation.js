/*
© Copyright IBM Corp. 2017
*/

var request = require('request');

var api_key = process.env.API_KEY;
var knowledge_url = process.env.HUB_URL + 'knowledge/';

function KnowledgeRelation(type, fromObject, toObject) {
  this.type = type;
  if (!fromObject.id || !toObject.id){
    throw 'Objects must have IDs -- try creating them first';
  }
  this.from = fromObject;
  this.to = toObject;
}

KnowledgeRelation.prototype.create = function() {
  if (this.id) {
    throw 'KnowledgeRelation already created -- try update()'
  }
  var post_data = {
    'fromId': this.from.id,
    'toId': this.to.id,
    'type': this.type
  };
  var headers = {
    'Content-type': 'application/json',
    'api_key': api_key
  };

  var options = {
    url: knowledge_url + 'relation',
    method: 'post',
    headers: headers,
    body: JSON.stringify(post_data)
  };

  var self = this;
  return new Promise(function (res, rej) {
    request(options, function(err, response, body) {
      if (err || response.statusCode !== 200) {
        console.log('Error: ', err, body);
        rej(body);
      } else {
        self.id = JSON.parse(body)['results'][0]['id'];
        console.log('Created relation:', self.from.id, '(' + self.from.type + ') -[' + self.type + ']->', self.to.id, '(' + self.to.type +')');
        res(body);
      }
    });
  });
};

module.exports = KnowledgeRelation;
