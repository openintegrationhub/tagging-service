const mongoose = require("mongoose");
const Server = require("../app/server");
const log = require("../app/config/logger");
const TagsGroup = require("../app/models/tagsGroup");
const { validate } = require("../app/utils/validator");

const tagsGroup = [
  new TagsGroup({
    name: "Collections",
    slug: "collections",
  }),
];

const mainServer = new Server();

async function main() {
  mainServer.setup(mongoose);

  tagsGroup.forEach((tagGroup) => {
    const errors = validate(tagGroup);
    if (errors && errors.length) {
      log.error(errors);
      throw new Error(`"${tagGroup.name}" object is not valid.`);
    }
  });
  return TagsGroup.insertMany(tagsGroup);
}

main()
  .then((data) => {
    log.info(`Inserted ${data.length}`);
    process.exit(0);
  })
  .catch((error) => {
    log.error(error);
    process.exit(-1);
  });
