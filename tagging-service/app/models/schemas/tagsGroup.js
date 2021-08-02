const mongoose = require('mongoose');
const CONSTANTS = require('../../constants');

const Schema = mongoose.Schema;

// Define schema
const tagsGroup = new Schema(
  {
    name: { type: String, maxlength: 50, required: true },
    slug: {
      type: String,
      maxlength: 30,
      required: true,
      unique: true,
      index: true,
    },
    level: {
      type: String,
      enum: Object.values(CONSTANTS.TAGS_GROUP_LEVEL),
      default: CONSTANTS.TAGS_GROUP_LEVEL.SYSTEM_LEVEL,
    },
    type: {
      type: String,
      enum: Object.values(CONSTANTS.TAGS_GROUP_TYPE),
      default: CONSTANTS.TAGS_GROUP_TYPE.SIMPLE,
    },
  },
  { timestamps: true },
);

module.exports.tagsGroup = tagsGroup;
