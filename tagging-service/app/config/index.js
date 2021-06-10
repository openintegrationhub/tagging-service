// General configuration file for variable urls, settings, etc.

const general = {
  mongoUrl: process.env.MONGODB_URL || 'mongodb://localhost:27017/taggingRepo',
  amqpUrl: process.env.QUEUE_URL || 'amqp://guest:guest@localhost:5672',
  iamToken: process.env.IAM_TOKEN,
  // "IAM_BASE_URL": "http://iam.oih-dev-ns.svc.cluster.local:3099/api/v1",
  gdprEventName: 'iam.user.deleted',
  templateDeletionEventName: 'templaterepo.template.deleted',

  taggingReadPermission: process.env.TAGGING_READ_PERMISSION || 'tagging.read',
  taggingWritePermission:
    process.env.TAGGING_WRITE_PERMISSION || 'tagging.write',
  taggingControlPermission:
    process.env.TAGGING_CONTROL_PERMISSION || 'tagging.control',
  originWhitelist: process.env.ORIGINWHITELIST
    ? process.env.ORIGINWHITELIST.split(',')
    : [],

  // Designates which storage system (Mongo, Kubernetes, MySQL, etc.) is used
  storage: 'mongo',

  loggingServiceBaseUrl:
    process.env.LOGGING_SERVICE_BASE_URL ||
    'http://logging-service.oih-dev-ns.svc.cluster.local:1234',
};

module.exports = general;
