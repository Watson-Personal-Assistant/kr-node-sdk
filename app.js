/*
 © Copyright IBM Corp. 2017
 */

var KnowledgeObject = require('./sdk/object');
var KnowledgeRelation = require('./sdk/relation');
var Agent = require('./sdk/messages');

// Create objects in local memory

var person = new KnowledgeObject('Person',
    {
      'name': 'TestBen',
      "latitude": 12.456,
      "longitude": 67.99
    }
);

var house = new KnowledgeObject('House',
    {
      "latitude": 12.345,
      "longitude": 67.890,
      "name": "home"
    }
);

var door = new KnowledgeObject('Door',
    {
      "isOpen": false,
      "name": "Front door"
    }
);

// Save them to the world model / blackboard
Promise.all(
    [
      person.create(),
      house.create(),
      door.create()
    ]
).then(
    function (results) {
      console.log('All objects created\n\n');

      // Create relations in local memory
      var personToHouse = new KnowledgeRelation('ownership', person, house);
      var houseToDoor = new KnowledgeRelation('has-as-part', house, door);

      // Save them to the world model
      Promise.all(
          [
            personToHouse.create(),
            houseToDoor.create()
          ]).then(
          function (results) {
            console.log('All relations created\n\n');
            runAgents();
          }
      );
    }
);

function getHouseAndPersonForDoor(doorId) {
  console.log("getting house and person for door with id: " + JSON.stringify(doorId));
  return KnowledgeObject.retrieve(doorId).then((door) => {
    console.log('Door id', door.id);
    // Get the house of the door
    return door.both('has-as-part');
  }).then((parts) => {
    var house = parts[0];
    console.log('House', house.id);
    // Get the owner of the house
    return house.both('ownership');
  }).then((owners) => {
    var owner = owners[0];
    return new Promise((res, rej) => {
      res([door, house, owner]);
    });
  });
}

function createSecurityNotification(event) {
  console.log("handling event: " + JSON.stringify(event));
  // Extract the door id from the event
  var doorId = event[0]['id'];
  getHouseAndPersonForDoor(doorId).then((objects) => {
    var door = objects[0];
    var house = objects[1];
    var owner = objects[2];
    var notification = new KnowledgeObject('SecurityNotification', {'name': 'DoorOpenNotification'});
    notification.create().then(() => {
      var notificationToSource = new KnowledgeRelation('notificationSource', notification, door);
      var notificationToTarget = new KnowledgeRelation('notificationTarget', notification, owner);
      Promise.all(
          [
            notificationToSource.create(),
            notificationToTarget.create()
          ]
      )
    });
  });
}

function alertUser(event) {
  console.log("handling event: " + JSON.stringify(event));
  var personId = event[0].toId;
  KnowledgeObject.retrieve(personId).then((person) => {
    console.log("Hey, " + person.attributes.name + " someone might be in your house!");
    cleanup();
  });
}

function checkType(event, type) {
  console.log("handling event: " + JSON.stringify(event));
  // The condition:  return true if you're telling me about a Door, false
  // otherwise
  var eventType = event[0]['type'];

  if (eventType == type) {
    return true;
  } else {
    return false;
  }
}

var doorOpenAgent = new Agent('object-update',
    function (event, callback) {
      var doorId = event[0]['id'];
      if (checkType(event, 'Door')) {
        return getHouseAndPersonForDoor(doorId).then((objects) => {
          // compare long lats
          var door = objects[0];
          var house = objects[1];
          var owner = objects[2];
          if (door.attributes.isOpen && (owner.attributes['longitude'] != house.attributes['longitude'] ||
              owner.attributes['latitude'] != house.attributes['latitude'])) {
            callback(true);
          } else {
            callback(false);
          }
        });
      } else {
        callback(false);
      }
    },
    createSecurityNotification);

var notificationAgent = new Agent('relation-create',
    function (event, callback) {
      callback(checkType(event, 'notificationTarget'));
    },
    alertUser);

function runAgents() {
  Promise.all(
      [
        doorOpenAgent.connect(),
        notificationAgent.connect()
      ]
  ).then(function () {
    doorOpenAgent.subscribe();
    notificationAgent.subscribe();
    console.log('Subscriptions created\n\n');
    door.attributes['isOpen'] = true;
    door.update();
  }, cleanup); //cleanup if the sub fails
}

// Delete objects from the world model
function cleanup() {
  Promise.all(
      [
        person.delete(),
        house.delete(),
        door.delete()
      ]);
}



