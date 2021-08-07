const mongoose = require('mongoose');

const tag = require('./schemas/tag').tag;

// Compile model from schema
module.exports = mongoose.model('Tag', tag);
