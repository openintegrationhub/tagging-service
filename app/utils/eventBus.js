const bunyan = require('bunyan');
const {
  EventBus,
  RabbitMqTransport,
  Event,
} = require('@openintegrationhub/event-bus');
const config = require('../config/index');
const log = require('../config/logger');
const { removeTemplateTaggedCollections } = require('./handlers');

const logger = bunyan.createLogger({ name: 'events' });

let eventBus;

async function connectQueue() {
  const transport = new RabbitMqTransport({
    rabbitmqUri: config.amqpUrl,
    logger,
  });
  eventBus = new EventBus({
    transport,
    logger,
    serviceName: 'tagging-service',
  });

  eventBus.subscribe(config.templateDeletionEventName, async (event) => {
    log.info(`Received event: ${JSON.stringify(event.headers)}`);

    const { templateId } = event.payload;
    if (templateId) {
      const deletedTaggedObjects = await removeTemplateTaggedCollections(
        templateId,
      );
      log.info(`Tagged objects removed: ${deletedTaggedObjects}`);
    }

    // confirm that message will be processed
    await event.ack();
  });

  // eventBus.subscribe(config.gdprEventName, async (event) => {
  //   log.info('Anonymising user data...');
  //   const response = await gdprAnonymise(event.payload.id);

  //   if (response === true) {
  //     await event.ack();
  //   } else {
  //     await event.nack();
  //   }
  // });

  await eventBus.connect();
}

async function publishQueue(ev) {
  try {
    const newEvent = new Event(ev);
    await eventBus.publish(newEvent);
    log.info(`Published event: ${JSON.stringify(ev)}`);
  } catch (err) {
    log.error(err);
  }
}

async function disconnectQueue() {
  await eventBus.disconnect();
}

async function reportHealth() {
  return eventBus._connected; // eslint-disable-line
}

module.exports = {
  connectQueue,
  publishQueue,
  disconnectQueue,
  reportHealth,
};
