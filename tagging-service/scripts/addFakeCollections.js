const mongoose = require("mongoose");
const { name } = require("faker");
const Server = require("../app/server");
const log = require("../app/config/logger");
const Tag = require("../app/models/tag");
const TagsGroup = require("../app/models/tagsGroup");
const { validate } = require("../app/utils/validator");

const numberOfTagsToCreate = 10;
const userId = process.env.USER_ID;

const createTags = (tagsGroupId) =>
  Array.from(Array(numberOfTagsToCreate)).map(
    (iterator) =>
      new Tag({
        tagsGroupId,
        name: name.title(),
        owners: [
          {
            id: userId,
            type: "user",
          },
        ],
      })
  );

const mainServer = new Server();

async function main() {
  mainServer.setup(mongoose);

  const tagGroup = await TagsGroup.findOne({
    slug: "collections",
  });
  const tags = createTags(tagGroup._id);
  const validTags = tags.filter((tag) => {
    const errors = validate(tag);
    return errors && !errors.length;
  });
  return Tag.insertMany(validTags);
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
