require('dotenv').config({path: __dirname + '/.env'});
var KnowledgeObject = require('./sdk/object');
var KnowledgeRelation = require('./sdk/relation');
// Rule condition
function getHouseAndPersonForDoor(doorId) {
  console.log('in getHouseAndPersonForDoor');
  var door, house, owner;
  return KnowledgeObject.retrieve(doorId).then((doorObj) => {
    door = doorObj;
    console.log('Door id', door.id);
    // Get the house of the door
    return door.both('has-as-part');
  }).then((parts) => {
    house = parts[0];
    console.log('House', house.id);
    // Get the owner of the house
    return house.both('ownership');
  }).then((owners) => {
    owner = owners[0];
    console.log('Owner', owner.id);
    return new Promise((res, rej) => {
      res([door, house, owner]);
    });
  }).catch((err) => {
    console.log('Error: ' + err);
  });
}
// Check that the update event is on a door
function checkType(event, type) {
  var eventType = event[0]['type'];
  if (eventType == type) {
    return true;
  } else {
    return false;
  }
}

// check is owner away
function main(event, callback) {
  console.log('in condition main');
  var doorId = event[0]['id'];
  console.log('got door id as ' + doorId);
  if (checkType(event, 'Door')) {
    return getHouseAndPersonForDoor(doorId).then((objects) => {
      var door = objects[0];
      var house = objects[1];
      var owner = objects[2];
      // if door is open and owner isn't at home
      if (door.attributes.isOpen &&
        (owner.attributes['longitude'] != house.attributes['longitude'] ||
        owner.attributes['latitude'] != house.attributes['latitude'])) {
        console.log("door is open and owner isn't home - return True");
        callback(true);
      } else {
        console.log("door is closed or owner is at home - return False");
        callback(false);
      }
    });
  } else {
    console.log("update wasn't on a door - return False");
    callback(false);
  }
}

exports.main = main;
exports.checkType = checkType;
