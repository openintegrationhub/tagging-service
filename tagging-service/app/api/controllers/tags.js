const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const { can } = require('@openintegrationhub/iam-utils');
const config = require('../../config/index');
const { validate } = require('../../utils/validator');
const TaggedObject = require('../../models/taggedObject');
const Tag = require('../../models/tag');

// eslint-disable-next-line import/no-dynamic-require
const storage = require(`./${config.storage}`);

const { ObjectId } = mongoose.Types;

const jsonParser = bodyParser.json();

const router = express.Router();

const log = require('../../config/logger');

router.use('/:tagsGroupSlug', async (req, res, next) => {
  const { tagsGroupSlug } = req.params;
  const tagsGroup = await storage.getTagsGroupBySlug(tagsGroupSlug);
  if (tagsGroup) {
    req.tagsGroup = tagsGroup;
    next();
  } else {
    res.status(404).send({ errors: [{ code: 404, message: 'No slug found' }] });
  }
});

// Gets all tags from a tagsGroup
router.get(
  '/:tagsGroupSlug',
  jsonParser,
  can(config.taggingReadPermission),
  async (req, res) => {
    const { user, query, tagsGroup } = req;
    const hasTaggedObjects = query.hasTaggedObjects === 'true';
    const tags = await storage.getTags(user, tagsGroup.id, hasTaggedObjects);
    res.status(200).send(tags);
  },
);

// Create a new
router.post(
  '/:tagsGroupSlug',
  jsonParser,
  can(config.taggingWritePermission),
  async (req, res) => {
    const newTag = req.body;

    // Automatically adds the current user as an owner, if not already included.
    if (!newTag.owners) {
      newTag.owners = [];
    }
    if (newTag.owners.findIndex((o) => o.id === req.user.sub) === -1) {
      newTag.owners.push({ id: req.user.sub, type: 'user' });
    }
    const tagsGroupId = req.tagsGroup.id;

    const storeTag = new Tag({
      ...newTag,
      tagsGroupId,
    });
    const errors = validate(storeTag);

    if (errors && errors.length > 0) {
      return res.status(400).send({ errors });
    }

    try {
      const response = await storage.addTag(storeTag);

      return res.status(201).send({ data: response, meta: {} });
    } catch (err) {
      log.error(err);
      return res.status(500).send({ errors: [{ message: err }] });
    }
  },
);

router.get(
  '/:tagsGroupSlug/taggedObjects',
  jsonParser,
  can(config.taggingReadPermission),
  async (req, res) => {
    const { tagsGroup } = req;
    const { objectId } = req.query;
    let objectIds = [];
    if (objectId) {
      objectIds = Array.isArray(objectId) ? objectId : [objectId];
    }
    const groupedTaggedObjects = await storage.getTaggedObjectsByTagsGroup(
      tagsGroup.id,
      objectIds,
    );
    res.status(200).send({ data: groupedTaggedObjects });
  },
);

const areSomeTaggedObjectsInvalid = (taggedObjects) =>
  taggedObjects.some((taggedObject) => {
    if (!('objectId' in taggedObject) || !('tagsIds' in taggedObject)) {
      return true;
    }
    if (!ObjectId.isValid(taggedObject.objectId)) {
      return true;
    }
    if (
      !Array.isArray(taggedObject.tagsIds) ||
      !taggedObject.tagsIds.every((tagId) => ObjectId.isValid(tagId))
    ) {
      return true;
    }
    return false;
  });

// upsert all relations from a tag
router.post(
  '/:tagsGroupSlug/upsertTaggedObjects',
  jsonParser,
  can(config.taggingWritePermission),
  async (req, res) => {
    const { user } = req;
    const params = req.body;
    const { taggedObjects } = params;
    if (!Array.isArray(taggedObjects)) {
      return res.status(400).send({
        errors: [{ message: 'taggedObjects must be an array.', code: 400 }],
      });
    }
    if (areSomeTaggedObjectsInvalid(taggedObjects)) {
      return res.status(400).send({
        errors: [
          {
            message: 'Not all taggedObjects properties has valid values.',
            code: 400,
          },
        ],
      });
    }

    const tagsGroupId = req.tagsGroup.id;
    const flattedTags = taggedObjects
      .map((taggedObject) => taggedObject.tagsIds)
      .flat();
    const uniqueTags = [...new Set(flattedTags)];
    const areAllTagsValid = await storage.validateTagsIds(
      user,
      uniqueTags,
      tagsGroupId,
    );
    if (!areAllTagsValid) {
      return res.status(400).send({
        errors: [{ message: 'Not all tagsIds are valid.', code: 400 }],
      });
    }

    const errors = [];
    const parsedTaggedObjects = {};
    taggedObjects.forEach(({ objectId, tagsIds }) => {
      tagsIds.forEach((tagId) => {
        const taggedObject = new TaggedObject({
          tagId,
          objectId,
          tagsGroupId,
        });
        const taggedObjectErrors = validate(taggedObject);

        if (taggedObjectErrors && taggedObjectErrors.length) {
          errors.concat(taggedObjectErrors);
        }

        if (!parsedTaggedObjects[objectId]) {
          parsedTaggedObjects[objectId] = [taggedObject];
        } else {
          parsedTaggedObjects[objectId].push(taggedObject);
        }
      });
    });

    if (errors.length) {
      return res.status(400).send({ errors });
    }

    let processedTaggedObjects = 0;
    for (const { objectId } of taggedObjects) {
      processedTaggedObjects += await storage.upsertTaggedObjects(
        objectId,
        tagsGroupId,
        parsedTaggedObjects[objectId] || [],
      );
    }

    return res.status(200).send({
      data: {
        processed: processedTaggedObjects,
      },
    });
  },
);

router.get('/', (_, res) => res.sendStatus(404));

module.exports = router;
