const mongoose = require('mongoose');
const Server = require('../app/server');
const log = require('../app/config/logger');
const TagsGroup = require('../app/models/tagsGroup');
const Tag = require('../app/models/tag');
const { validate } = require('../app/utils/validator');

const tagsGroup = [
  new TagsGroup({
    name: 'Collections',
    slug: 'collections',
  }),
  new TagsGroup({
    name: 'ICenter sections',
    slug: 'sections',
  }),
];

const addTagsGroup = async () => {
  const validTags = [];

  for (let index = 0; index < tagsGroup.length; index++) {
    const element = tagsGroup[index];
    const elementDb = await TagsGroup.findOne({
      slug: element.slug,
    });
    if (!elementDb) {
      const errors = validate(element);
      if (errors && errors.length) {
        log.error(errors);
        throw new Error(`"${element.name}" object is not valid.`);
      } else {
        validTags.push(element);
      }
    }
  }

  const response = await TagsGroup.insertMany(validTags);
  return response.length;
};

const tags = [
  {
    tagsGroupSlug: 'sections',
    tags: [
      {
        name: 'Featured',
        tagGroupId: '',
        isSystemTag: true,
      },
      {
        name: 'New',
        tagGroupId: '',
        isSystemTag: true,
      },
      {
        name: 'Recommended',
        tagGroupId: '',
        isSystemTag: true,
      },
      {
        name: 'Most popular',
        tagGroupId: '',
        isSystemTag: true,
      },
    ],
  },
];

const addSystemTags = async () => {
  let insertedTags = 0;
  for (const tagToInsert of tags) {
    // we get the tagsGroup id
    const tagsGroup = await TagsGroup.findOne({
      slug: tagToInsert.tagsGroupSlug,
    });

    if (tagsGroup) {
      const tagsGroupId = tagsGroup._id;

      for (const tag of tagToInsert.tags) {
        // we check if the tag already exists
        const tagDb = await Tag.findOne({
          tagsGroupId,
          name: tag.name,
          isSystemTag: true,
        });

        if (!tagDb) {
          // we insert a new system tag
          tag.tagsGroupId = tagsGroupId;
          await Tag.create(tag);
          insertedTags += 1;
        }
      }
    }
  }
  return insertedTags;
};

const mainServer = new Server();

async function main() {
  mainServer.setup(mongoose);

  const insertedTagsGroup = await addTagsGroup();
  const insertedSystemTags = await addSystemTags();

  return `Inserted tagsGroups: ${insertedTagsGroup} and tags: ${insertedSystemTags} `;
}

main()
  .then((data) => {
    log.info(data);
    process.exit(0);
  })
  .catch((error) => {
    log.error(error);
    process.exit(-1);
  });
