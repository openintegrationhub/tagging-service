const mongoose = require('mongoose');

const Schema = mongoose.Schema;

module.export = new Schema(
  {
    id: String,
    type: String,
  },
  { _id: false },
);
