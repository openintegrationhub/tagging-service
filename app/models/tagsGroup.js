const mongoose = require('mongoose');

const tagsGroup = require('./schemas/tagsGroup').tagsGroup;

// Compile model from schema
module.exports = mongoose.model('TagsGroup', tagsGroup);
