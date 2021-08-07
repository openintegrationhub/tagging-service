const mongoose = require('mongoose');

process.env.MONGODB_URL = global.__MONGO_URI__;

const hostUrl = 'http://localhost';
const port = process.env.PORT || 3001;
const request = require('supertest')(`${hostUrl}:${port}`);
const iamMock = require('./utils/iamMock');
const TagsGroup = require('../app/models/tagsGroup');
const Tag = require('../app/models/tag');
const TaggedObject = require('../app/models/taggedObject');

const { removeTemplateTaggedCollections } = require('../app/utils/handlers');
const Server = require('../app/server');

const mainServer = new Server();

let app;

const tagsGroupSlug = 'collections';

const initializeData = async () => {
  const newTagsGroup = new TagsGroup({
    slug: tagsGroupSlug,
    name: 'Collections',
  });
  await newTagsGroup.save();
};

beforeAll(async () => {
  iamMock.setup();
  mainServer.setupMiddleware();
  mainServer.setupRoutes();
  //   mainServer.setupSwagger();
  mainServer.setup(mongoose);
  app = mainServer.listen();
  await initializeData();
});

afterAll(async () => {
  mongoose.connection.close();
  app.close();
});

let tag1;
let tag2;
let tag3;
const taggedObjectId = new mongoose.Types.ObjectId();
const secondTaggedObjectId = new mongoose.Types.ObjectId();
const thirdTaggedObjectId = new mongoose.Types.ObjectId();

describe('Login Security', () => {
  test('should not be able to get tags from one tagsGroup without login', async () => {
    const response = await request.get(`/tags/${tagsGroupSlug}`);
    expect(response.status).toEqual(401);
    expect(response.text).not.toHaveLength(0);
    expect(response.res.statusMessage).toEqual('Unauthorized');
  });

  test('should not be able to get taggedObject without login', async () => {
    const response = await request.get(`/tags/${tagsGroupSlug}/taggedObjects`);
    expect(response.status).toEqual(401);
    expect(response.text).not.toHaveLength(0);
    expect(response.res.statusMessage).toEqual('Unauthorized');
  });

  test('should not be able to create tags without login', async () => {
    const response = await request
      .post(`/tags/${tagsGroupSlug}`)
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        name: 'Collection 1',
      });
    expect(response.status).toEqual(401);
    expect(response.text).not.toHaveLength(0);
    expect(response.res.statusMessage).toEqual('Unauthorized');
  });

  test('should not be able to assign objects to tags without login', async () => {
    const response = await request
      .post(`/tags/${tagsGroupSlug}/upsertTaggedObjects`)
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        taggedObjects: [],
      });
    expect(response.status).toEqual(401);
    expect(response.text).not.toHaveLength(0);
    expect(response.res.statusMessage).toEqual('Unauthorized');
  });
});

describe('Permissions', () => {
  test('should not be able to get tags from a tags group without permissions', async () => {
    const response = await request
      .get(`/tags/${tagsGroupSlug}`)
      .set('Authorization', 'Bearer unpermitToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(response.status).toEqual(403);
    expect(response.text).not.toHaveLength(0);
    expect(response.res.statusMessage).toEqual('Forbidden');
  });

  test('should not be able to get taggedObjects from a tag without permissions', async () => {
    const response = await request
      .get(`/tags/${tagsGroupSlug}/taggedObjects`)
      .set('Authorization', 'Bearer unpermitToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(response.status).toEqual(403);
    expect(response.text).not.toHaveLength(0);
    expect(response.res.statusMessage).toEqual('Forbidden');
  });

  test('should not be able to create a tag without permissions', async () => {
    const response = await request
      .post(`/tags/${tagsGroupSlug}`)
      .set('Authorization', 'Bearer unpermitToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        name: 'Collection 1',
      });
    expect(response.status).toEqual(403);
    expect(response.text).not.toHaveLength(0);
    expect(response.res.statusMessage).toEqual('Forbidden');
  });
  test('should not be able to upsert taggedObjects without permissions', async () => {
    const taggedObjects = [
      {
        objectId: taggedObjectId,
        tagsIds: [tag2, tag3],
      },
    ];

    const response = await request
      .post(`/tags/${tagsGroupSlug}/upsertTaggedObjects`)
      .set('Authorization', 'Bearer unpermitToken')
      .send({
        taggedObjects,
      });
    expect(response.status).toEqual(403);
    expect(response.text).not.toHaveLength(0);
    expect(response.res.statusMessage).toEqual('Forbidden');
  });
});

describe('Tags Operations', () => {
  test('should not add a tag when name is missing', async () => {
    const res = await request
      .post(`/tags/${tagsGroupSlug}`)
      .set('Authorization', 'Bearer permitToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        name: '',
      });
    expect(res.status).toEqual(400);
    expect(res.body.errors[0].message).toBe('Path `name` is required.');
  });
  test('should not add a tag when tags group slug does not exist', async () => {
    const res = await request
      .post(`/tags/notexists`)
      .set('Authorization', 'Bearer permitToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        name: 'test',
      });
    expect(res.status).toEqual(404);
    expect(res.body.errors[0].message).toBe('No slug found');
  });
});

describe('Tags Operations', () => {
  test('should add a tag', async () => {
    const res = await request
      .post(`/tags/${tagsGroupSlug}`)
      .set('Authorization', 'Bearer permitToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        name: 'Collection 1',
      });
    expect(res.status).toEqual(201);
    expect(res.text).not.toHaveLength(0);
    const j = res.body;
    expect(j).not.toBeNull();
    expect(j.data).toHaveProperty('id');

    tag1 = j.data.id;
  });

  test('should add a second tag', async () => {
    const res = await request
      .post(`/tags/${tagsGroupSlug}`)
      .set('Authorization', 'Bearer permitToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        name: 'Collection 2',
      });
    expect(res.status).toEqual(201);
    expect(res.text).not.toHaveLength(0);
    const j = res.body;
    expect(j).not.toBeNull();
    expect(j.data).toHaveProperty('id');

    tag2 = j.data.id;
  });

  test('should add a third tag', async () => {
    const res = await request
      .post(`/tags/${tagsGroupSlug}`)
      .set('Authorization', 'Bearer permitToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        name: 'Collection 3',
      });
    expect(res.status).toEqual(201);
    expect(res.text).not.toHaveLength(0);
    const j = res.body;
    expect(j).not.toBeNull();
    expect(j.data).toHaveProperty('id');

    tag3 = j.data.id;
  });

  test('should not get any tag when slug does not exist', async () => {
    const res = await request
      .get(`/tags/notexists`)
      .set('Authorization', 'Bearer permitToken');

    expect(res.status).toEqual(404);
    expect(res.body).not.toBeNull();
    expect(res.body.errors[0].message).toBe('No slug found');
  });

  test('should get three tags', async () => {
    const res = await request
      .get(`/tags/${tagsGroupSlug}`)
      .set('Authorization', 'Bearer permitToken');

    expect(res.status).toEqual(200);
    expect(res.body).not.toBeNull();
    const response = res.body;
    expect(response.data).toHaveLength(3);
  });
  test('should not upsert objects when objectId is not a valid ObjectId', async () => {
    const taggedObjects = [
      {
        objectId: 'notObjectId1111',
        tagsIds: [tag2, tag3],
      },
    ];

    const res = await request
      .post(`/tags/${tagsGroupSlug}/upsertTaggedObjects`)
      .set('Authorization', 'Bearer permitToken')
      .send({
        taggedObjects,
      });
    expect(res.status).toEqual(400);
    expect(res.body).not.toBeNull();
    expect(res.body.errors[0].message).toBe(
      'Not all taggedObjects properties has valid values.',
    );
  });

  test('should not upsert objects when a tagId is not a valid ObjectId', async () => {
    const taggedObjects = [
      {
        objectId: taggedObjectId,
        tagsIds: ['notObjectId1111', tag3],
      },
    ];

    const res = await request
      .post(`/tags/${tagsGroupSlug}/upsertTaggedObjects`)
      .set('Authorization', 'Bearer permitToken')
      .send({
        taggedObjects,
      });
    expect(res.status).toEqual(400);
    expect(res.body).not.toBeNull();
    expect(res.body.errors[0].message).toBe(
      'Not all taggedObjects properties has valid values.',
    );
  });

  test('should not upsert objects when a tagId does not exist in db', async () => {
    const taggedObjects = [
      {
        objectId: taggedObjectId,
        tagsIds: [new mongoose.Types.ObjectId(), tag3],
      },
    ];

    const res = await request
      .post(`/tags/${tagsGroupSlug}/upsertTaggedObjects`)
      .set('Authorization', 'Bearer permitToken')
      .send({
        taggedObjects,
      });
    expect(res.status).toEqual(400);
    expect(res.body).not.toBeNull();
    expect(res.body.errors[0].message).toBe('Not all tagsIds are valid.');
  });

  test('should upsert objects to the first tag', async () => {
    const taggedObjects = [
      {
        objectId: taggedObjectId,
        tagsIds: [tag1],
      },
    ];

    const res = await request
      .post(`/tags/${tagsGroupSlug}/upsertTaggedObjects`)
      .set('Authorization', 'Bearer permitToken')
      .send({
        taggedObjects,
      });
    expect(res.status).toEqual(200);
    expect(res.body).not.toBeNull();
    const response = res.body;
    expect(response.data.processed).toBe(1);
  });

  test('should upsert objects to the second/third tag', async () => {
    const taggedObjects = [
      {
        objectId: taggedObjectId,
        tagsIds: [],
      },
      {
        objectId: secondTaggedObjectId,
        tagsIds: [tag2, tag3],
      },
      {
        objectId: thirdTaggedObjectId,
        tagsIds: [tag2],
      },
    ];

    const res = await request
      .post(`/tags/${tagsGroupSlug}/upsertTaggedObjects`)
      .set('Authorization', 'Bearer permitToken')
      .send({
        taggedObjects,
      });
    expect(res.status).toEqual(200);
    expect(res.body).not.toBeNull();
    const response = res.body;
    expect(response.data.processed).toBe(3);
    const firstTag = await Tag.findById(tag1);
    expect(firstTag.taggedObjectsCount).toBe(0);
  });

  test('should get the two tags with taggedObjects', async () => {
    const res = await request
      .get(`/tags/${tagsGroupSlug}?hasTaggedObjects=true`)
      .set('Authorization', 'Bearer permitToken');

    expect(res.status).toEqual(200);
    expect(res.body).not.toBeNull();
    const response = res.body;
    expect(response.data).toHaveLength(2);
  });

  test('should get tags with taggedObjects', async () => {
    const res = await request
      .get(`/tags/${tagsGroupSlug}?hasTaggedObjects=true`)
      .set('Authorization', 'Bearer permitToken');

    expect(res.status).toEqual(200);
    expect(res.body).not.toBeNull();
    const response = res.body;
    expect(response.data).toHaveLength(2);
  });

  test('should get objectId with taggedObjects', async () => {
    const res = await request
      .get(
        `/tags/${tagsGroupSlug}/taggedObjects?objectId=${secondTaggedObjectId}`,
      )
      .set('Authorization', 'Bearer permitToken');

    expect(res.status).toEqual(200);
    expect(res.body).not.toBeNull();
    const response = res.body;
    expect(response.data).toHaveLength(1);
    const taggedObject = response.data[0];
    expect(taggedObject.objectId).toBe(secondTaggedObjectId.toHexString());
    expect(taggedObject.tagsIds).toHaveLength(2);
  });

  test('should delete a tag and its taggedObjects', async () => {
    const res = await request
      .delete(`/tags/${tagsGroupSlug}/${tag2}`)
      .set('Authorization', 'Bearer permitToken');

    expect(res.status).toEqual(200);

    const tag3Db = await Tag.findById(tag3);
    expect(tag3Db.taggedObjectsCount).toBe(1);
  });
});

describe('removeTemplateTaggedCollections Handler', () => {
  test('should remove all taggedObjects from secondTaggedObjectId', async () => {
    const deletedElements = await removeTemplateTaggedCollections(
      secondTaggedObjectId,
    );
    expect(deletedElements).toBe(1);
    const taggedObjects = await TaggedObject.find({
      objectId: secondTaggedObjectId,
    });
    expect(taggedObjects).toHaveLength(0);
    const tag3Db = await Tag.findById(tag3);
    expect(tag3Db.taggedObjectsCount).toBe(0);
  });
});
