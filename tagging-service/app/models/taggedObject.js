const mongoose = require('mongoose');

const taggedObject = require('./schemas/taggedObject').taggedObject;

// Compile model from schema
module.exports = mongoose.model('taggedObject', taggedObject);
