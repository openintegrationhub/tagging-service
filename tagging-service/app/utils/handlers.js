const mongoose = require('mongoose');
const log = require('../config/logger');
const config = require('../config/index');

const storage = require(`../api/controllers/${config.storage}`); // eslint-disable-line

async function cleanupOrphans() {
  const { publishQueue } = require('./eventBus'); // eslint-disable-line

  const orphans = await storage.getOrphanedCollections();
  const promises = [];
  let counter = 0;
  for (let i = 0; i < orphans.length; i += 1) {
    if (orphans[i].status === 'active') {
      counter += 1;
      const formattedOrphan = storage.format(orphans[i]);
      formattedOrphan.status = 'inactive';

      const ev = {
        headers: {
          name: 'collections.collection.modified',
        },
        payload: formattedOrphan,
      };
      promises.push(publishQueue(ev));
    }
  }

  await Promise.all(promises);

  return counter;
}

async function gdprAnonymise(id) {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return false;
  }

  if (!id) {
    log.warn('Received anonymise event without ID given');
    return true;
  }

  await storage.anonymise(id);

  await cleanupOrphans();

  return true;
}

let collectionTagGroup;

const removeTemplateTaggedCollections = async (templateId) => {
  // we remove all taggedObjects with this templateId and the collection tag group
  if (!collectionTagGroup) {
    collectionTagGroup = await storage.getTagsGroupBySlug('collections');
  }
  // we get the current tagged objects before we remove them
  const taggedObjects = await storage.getTaggedObjectsFromObject(
    templateId,
    collectionTagGroup.id,
  );
  const removedTaggedObjects = await storage.removeTagsFromObject(
    templateId,
    collectionTagGroup.id,
  );

  // we decrease the counter of the deleted tags
  await storage.increaseTaggedObjecsCount(
    taggedObjects.map(({ tagId }) => tagId),
    -1,
  );

  return removedTaggedObjects.deletedCount;
};

module.exports = {
  gdprAnonymise,
  cleanupOrphans,
  removeTemplateTaggedCollections,
};
