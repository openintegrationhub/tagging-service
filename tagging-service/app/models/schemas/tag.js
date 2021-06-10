const mongoose = require('mongoose');
const owner = require('./owner');

const Schema = mongoose.Schema;

// Define schema
const tag = new Schema(
  {
    name: { type: String, maxlength: 50, required: true },
    description: { type: String, maxlength: 300, required: false },
    logo: { type: String },
    owners: { type: [owner] },
    tagsGroupId: {
      type: Schema.Types.ObjectId,
      ref: 'tagsGroup',
      index: true,
      required: true,
    },
    taggedObjectsCount: { type: Number, default: 0 },
  },
  { collection: 'tag', timestamps: true },
);

tag.index({ _id: 1, tagsGroupId: 1 });
tag.index({ tagsGroupId: 1, 'owners.id': 1, taggedObjectsCount: 1 });

module.exports.tag = tag;
