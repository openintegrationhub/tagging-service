// require our MongoDB-Model
const mongoose = require('mongoose');
const log = require('../../config/logger');
const Tag = require('../../models/tag');
const TagsGroup = require('../../models/tagsGroup');
const TaggedObject = require('../../models/taggedObject');

const { ObjectId } = mongoose.Types;

const buildQuery = (user, id) => {
  let findId;
  const qry = {};
  if (id) {
    findId = ObjectId(id);
    qry._id = findId;
  }

  // If the user is not an OIH admin, constrain query by flow ownership
  if (!user.isAdmin) {
    const owners = [user.sub];
    if (user.tenant) owners.push(user.tenant);
    qry['owners.id'] = { $in: owners };
  }

  return qry;
};

const format = (collection) => {
  const newCollection = collection;
  if (newCollection) {
    newCollection.id = newCollection._id.toString();
    delete newCollection._id;
    delete newCollection.__v;
  }
  return newCollection;
};

const getTagsGroupBySlug = (slug) =>
  new Promise((resolve) => {
    TagsGroup.findOne({ slug })
      .lean()
      .then((doc) => {
        const tagGroup = format(doc);
        resolve(tagGroup);
      })
      .catch((err) => {
        log.error(err);
      });
  });

const getTags = (
  user,
  tagsGroupId,
  hasTaggedObjects,
  sortField = 'name',
  sortOrder = 1,
) =>
  new Promise((resolve) => {
    const query = {
      ...buildQuery(user, null),
    };

    if (hasTaggedObjects) {
      query.taggedObjectsCount = {
        $gt: 0,
      };
    }

    const sort = {
      [sortField]: sortOrder,
    };

    // we get all tags by tenant and all system tags
    const orQuery = {
      tagsGroupId: ObjectId(tagsGroupId),
      $or: [
        query,
        {
          isSystemTag: true,
        },
      ],
    };

    Tag.find(orQuery)
      .sort(sort)
      .lean()
      .then((doc) => {
        const tags = doc;
        const formattedTags = tags.map((tag) => format(tag));
        resolve({ data: formattedTags });
      })
      .catch((err) => {
        log.error(err);
      });
  });

const getTaggedObjectsByTagsGroup = async (tagsGroupId, objectIds) => {
  const query = {
    tagsGroupId: ObjectId(tagsGroupId),
  };
  if (objectIds && objectIds.length) {
    query.objectId = {
      $in: objectIds.map((objId) => ObjectId(objId)),
    };
  }
  const aggregation = [
    {
      $match: query,
    },
    {
      $group: {
        _id: {
          objectId: '$objectId',
        },
        tagsIds: {
          $push: '$tagId',
        },
      },
    },
    {
      $project: {
        _id: 0,
        objectId: '$_id.objectId',
        tagsIds: 1,
      },
    },
  ];
  return TaggedObject.aggregate(aggregation).exec();
};

const validateTagsIds = async (user, tagsIds, tagsGroupId) => {
  let totalTags = 0;
  if (tagsIds.length) {
    const query = {
      tagsGroupId,
      _id: {
        $in: tagsIds,
      },
      ...buildQuery(user),
    };
    totalTags = await Tag.countDocuments(query);
  }

  return tagsIds.length === totalTags;
};

const removeTagsFromObject = (objectId, tagsGroupId) =>
  TaggedObject.deleteMany({
    objectId,
    tagsGroupId,
  });

const increaseTaggedObjecsCount = (ids, increment) =>
  Tag.updateMany(
    {
      _id: {
        $in: ids,
      },
    },
    {
      $inc: {
        taggedObjectsCount: increment,
      },
    },
  );

const upsertTaggedObjects = async (objectId, tagsGroupId, taggedObjects) => {
  const oldTaggedObjects = await TaggedObject.find({
    objectId,
    tagsGroupId,
  });

  if (oldTaggedObjects.length) {
    await removeTagsFromObject(objectId, tagsGroupId);
  }

  const oldTagsIds = oldTaggedObjects.map(
    (oldTaggedObject) => oldTaggedObject.tagId,
  );
  const newTagsIds = taggedObjects.map((taggedObject) => taggedObject.tagId);

  const toIncreaseIds = [];
  await Promise.all(
    taggedObjects.map(async (taggedObject) => {
      await taggedObject.save();
      if (!oldTagsIds.includes(taggedObject.tagId)) {
        toIncreaseIds.push(taggedObject.tagId);
      }
    }),
  );

  const toDecreaseIds = oldTagsIds.filter(
    (tagId) => !newTagsIds.includes(tagId),
  );

  if (toIncreaseIds.length) {
    await increaseTaggedObjecsCount(toIncreaseIds, 1);
  }

  if (toDecreaseIds.length) {
    await increaseTaggedObjecsCount(toDecreaseIds, -1);
  }

  return taggedObjects.length;
};

const addTag = (storeTag) =>
  new Promise((resolve) => {
    storeTag
      .save()
      .then((doc) => {
        const collection = format(doc._doc);
        resolve(collection);
      })
      .catch((err) => {
        log.error(err);
      });
  });

const getOneTag = async (user, id) => {
  const query = buildQuery(user, id);
  const tag = await Tag.findOne(query).lean();
  return format(tag);
};

const removeTagsFromTagId = (tagId, tagsGroupId) =>
  TaggedObject.deleteMany({
    tagId,
    tagsGroupId,
  });

const deleteTagWithTaggedObjects = async (user, id, tagsGroupId) => {
  await removeTagsFromTagId(id, tagsGroupId);
  const query = buildQuery(user, id);
  const tag = await Tag.findOneAndDelete(query);
  return format(tag);
};

const updateTag = async (user, id, payload) => {
  const query = buildQuery(user, id);
  const tag = await Tag.findOneAndUpdate(query, payload, {
    new: true,
  });
  return format(tag);
};

const getTaggedObjectsFromObject = (objectId, tagsGroupId) => {
  const query = {
    objectId,
  };
  if (tagsGroupId) {
    query.tagsGroupId = tagsGroupId;
  }
  return TaggedObject.find(query);
};

module.exports = {
  getOneTag,
  getTags,
  getTagsGroupBySlug,
  getTaggedObjectsByTagsGroup,
  validateTagsIds,
  upsertTaggedObjects,
  addTag,
  removeTagsFromObject,
  deleteTagWithTaggedObjects,
  updateTag,
  getTaggedObjectsFromObject,
  increaseTaggedObjecsCount,
};
