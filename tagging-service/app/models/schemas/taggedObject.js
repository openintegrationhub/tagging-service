const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// Define schema
const taggedObject = new Schema(
  {
    tagId: {
      type: Schema.Types.ObjectId,
      ref: 'tag',
      required: true,
    },
    objectId: { type: Schema.Types.ObjectId, required: true },
    tagsGroupId: {
      type: Schema.Types.ObjectId,
      ref: 'tagsGroup',
      required: true,
      index: true,
    },
  },
  { collection: 'taggedObject' },
);

taggedObject.index({ objectId: 1, tagsGroupId: 1 });

module.exports.taggedObject = taggedObject;
