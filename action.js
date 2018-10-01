require('dotenv').config({ path: __dirname + '/.env' });
var request = require('request');
var KnowledgeObject = require('./sdk/object');

// Main function
function main(event) {
  console.log('in action main');
  var doorId = event[0].id;
  console.log('got door id as ' + doorId)
  return KnowledgeObject.retrieve(doorId).then((doorObj) => {
    console.log('Door name', JSON.stringify(doorObj));
    name = doorObj.attributes.name;

    var post_data = {
      'key': process.env.API_KEY,
      'alert': `Alert! Your ${name} is open!`
    };
    var headers = {
      'Content-type': 'application/json',
    };
    var options = {
      url: 'http://wpa-chat-bot.mybluemix.net/notification',
      method: 'POST',
      headers: headers,
      body: JSON.stringify(post_data)
    };

    return new Promise(function (res, rej) {
      request(options, function (err, response, body) {
        if (err || (response && response.statusCode !== 200)) {
          console.log(`Error sending notification ${err} ${body}`);
          if (response.statusCode) {
              console.log(`Status code ${response.statusCode}`);
          }
          rej(body);
        } else {
          resData = { body: body };
          res(resData);
        }
      });
    });
  });
}

exports.main = main;
