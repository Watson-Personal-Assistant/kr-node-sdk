/*
 © Copyright IBM Corp. 2017
 */

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();

app.use(bodyParser.json());

var Kafka = require('node-rdkafka');
var config = require('./config.json');

var api_key = process.env.API_KEY;
var hub_url = process.env.HUB_URL;

class Agent {
    constructor(event, conditionMethod, actionMethod) {
        this.event = event;
        this.conditionMethod = conditionMethod;
        this.actionMethod = actionMethod;

        // optional - save the message hub credentials in the configuration file

        /*
        // Config common options
        var driver_options = {
            //'debug': 'all',
            'metadata.broker.list': config.MESSAGE_HUB.kafka_brokers_sasl,
            'security.protocol': 'sasl_ssl',
            'ssl.ca.location': '/etc/ssl/certs',
            'sasl.mechanisms': 'PLAIN',
            'sasl.username': config.MESSAGE_HUB.user,
            'sasl.password': config.MESSAGE_HUB.password,
            'api.version.request': true,
            'broker.version.fallback': '0.10.2.1'
        };

        var consumer_opts = {
            'client.id': 'kafka-nodejs-console-sample-consumer',
            'group.id': 'kafka-nodejs-console-sample-group'
        };

        // Add the common options to client
        for (var key in driver_options) {
            consumer_opts[key] = driver_options[key];
        }

        this.connection_options = consumer_opts;
        */
    }

    connect() {
        let agent = this;

        var headers = {
            'api_key': app.get("api_key") || api_key
        };

        var options = {
            url: (app.get("hub_url") || hub_url) + 'knowledge/message-hub-credentials',
          method: 'get',
          headers: headers
        };

        return new Promise(function (res, rej) {
            request(options, function (err, response, body) {
                if (err || response.statusCode !== 200) {
                    console.log("error:" + body);
                    rej(body);
                } else {
                    var credentials = JSON.parse(body);

                    // Config common options
                    var driver_options = {
                        //'debug': 'all',
                        'metadata.broker.list': credentials.kafka_brokers_sasl,
                      'security.protocol': 'sasl_ssl',
                      'ssl.ca.location': '/etc/ssl/certs',
                      'sasl.mechanisms': 'PLAIN',
                      'sasl.username': credentials.user,
                      'sasl.password': credentials.password,
                      'api.version.request': true,
                      'broker.version.fallback': '0.10.2.1'
                    };

                    var consumer_opts = {
                        'client.id': 'kafka-nodejs-console-sample-consumer',
                      'group.id': 'kafka-nodejs-console-sample-group'
                    };

                    // Add the common options to client
                    for (var key in driver_options) {
                        consumer_opts[key] = driver_options[key];
                    }

                    agent.connection_options = consumer_opts;

                    res(consumer_opts);
                }
            });
        })
    }

    /*
     Agent subscription method.
     Event is a string and is one of:  "object-create", "object-update", "object-delete", "relation-create", "relation-delete"
     conditionMethod is a function that returns a boolean value depending on whether the action should be called
     actionMethod is the main function of the agent
     */
    subscribe() {
        let agent = this;

        console.log("Created agent with event " + this.event);
        var stream = Kafka.KafkaConsumer.createReadStream(this.connection_options, {}, {
            topics: [this.event]
        });
        agent.stream = stream;

        stream.on('data', function(kafka_message) {
            console.log('Got event');
            var event_data = JSON.parse(kafka_message.value.toString())["results"];
            console.log("event data: " + JSON.stringify(event_data));
            agent.conditionMethod(event_data, function(result) {
                console.log("checking condition for the event");
                if (result == true) {
                    console.log('Condition for the event was met. performing action');
                    agent.actionMethod(event_data);
                } else {
                    console.log('Condition for the event was not met, action not performed')
                }
            });
        });

    };

    close() {
        console.log("closing agent of event: " + this.event);
        this.stream.destroy();
    }
}

module.exports = Agent;