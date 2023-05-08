const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const asyncHandler = require('express-async-handler');
const { can } = require('@openintegrationhub/iam-utils');
const config = require('../../config/index');
const { validate } = require('../../utils/validator');
const TaggedObject = require('../../models/taggedObject');
const Tag = require('../../models/tag');
const TagGroup = require('../../models/tagsGroup');

// eslint-disable-next-line import/no-dynamic-require
const storage = require(`./${config.storage}`);

const { ObjectId } = mongoose.Types;

const jsonParser = bodyParser.json();

const router = express.Router();

const log = require('../../config/logger');

const loadTagGroupSync = async (req, res, next) => {
  const { tagsGroupSlug } = req.params;
  const tagsGroup = await storage.getTagsGroupBySlug(tagsGroupSlug);
  if (tagsGroup) {
    req.tagsGroup = tagsGroup;
    next();
  } else {
    return res
      .status(404)
      .send({ errors: [{ code: 404, message: 'No slug found' }] });
  }
};

const loadTagGroup = asyncHandler(loadTagGroupSync);

// Gets all tags from a tagsGroup
router.get(
  '/:tagsGroupSlug',
  jsonParser,
  can(config.taggingReadPermission),
  loadTagGroup,
  async (req, res) => {
    const { query, tagsGroup, user } = req;
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
    const newTagGroup = req.body;
    const { tagsGroupSlug } = req.params;

    const storedTagGroup = new TagGroup({
      ...newTagGroup,
      slug: tagsGroupSlug,
    });
    const errors = validate(storedTagGroup);

    if (errors && errors.length > 0) {
      return res.status(400).send({ errors });
    }

    try {
      const response = await storage.addTagGroup(storedTagGroup);

      return res.status(201).send({ data: response, meta: {} });
    } catch (err) {
      log.error(err);
      return res.status(500).send({ errors: [{ message: err }] });
    }
  },
);

// update the tag field
router.patch(
  '/:tagsGroupSlug/:id',
  jsonParser,
  can(config.taggingWritePermission),
  loadTagGroup,
  async (req, res) => {
    const { id } = req.params;

    try {
      if (!ObjectId.isValid(id)) {
        return res
          .status(400)
          .send({ errors: [{ message: 'Invalid id', code: 400 }] });
      }

      const tag = await storage.getOneTag(req.user, req.params.id);

      if (!tag) {
        return res
          .status(404)
          .send({ errors: [{ message: 'No tag found', code: 404 }] });
      }
      const updatedTag = { ...tag, ...req.body };
      updatedTag._id = updatedTag.id;
      delete updatedTag.id;

      if (!updatedTag.owners) {
        updatedTag.owners = [];
      }
      if (updatedTag.owners.findIndex((o) => o.id === req.user.sub) === -1) {
        updatedTag.owners.push({ id: req.user.sub, type: 'user' });
        // just for admins that couldn't have the tenant field
        if (req.user.tenant) {
          updatedTag.owners.push({ id: req.user.tenant, type: 'tenant' });
        }
      }

      const newTag = new Tag(updatedTag);
      const errors = validate(newTag);

      if (errors && errors.length > 0) {
        return res.status(400).send({ errors });
      }

      const result = await storage.updateTag(req.user, id, updatedTag);
      res.status(200).send({ data: result });
    } catch (e) {
      log.error(e);
      if (!res.headersSent) {
        return res.status(500).send(e);
      }
    }
  },
);

router.delete(
  '/:tagsGroupSlug/:id',
  jsonParser,
  can(config.taggingWritePermission),
  loadTagGroup,
  async (req, res) => {
    const { id } = req.params;
    const tagsGroupId = req.tagsGroup.id;

    try {
      if (!ObjectId.isValid(id)) {
        return res
          .status(400)
          .send({ errors: [{ message: 'Invalid id', code: 400 }] });
      }

      const tag = await storage.getOneTag(req.user, req.params.id);

      if (!tag) {
        return res
          .status(404)
          .send({ errors: [{ message: 'No tag found', code: 404 }] });
      }
      await storage.deleteTagWithTaggedObjects(req.user, id, tagsGroupId);

      res.status(200).send('Deletion successful');
    } catch (e) {
      log.error(e);
      if (!res.headersSent) {
        return res.status(500).send(e);
      }
    }
  },
);

router.get(
  '/:tagsGroupSlug/taggedObjects',
  jsonParser,
  can(config.taggingReadPermission),
  loadTagGroup,
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
  loadTagGroup,
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
