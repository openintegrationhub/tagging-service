## Tagging Service

This repo contains the Tagging Service, originally created for the OIH Platform. It may be used to tag/label other objects in the Framework Services, providing a system for categorization outside of object parameters.

In this service, users can create one or many Tag Groups that can be applied to other object types in the system. Under each Tag Group, Tags can then be created and specific objects may be tagged with one or many tags. (many-many relationship). Right now, if you want to create a new Tag Group, you have to do manually in database or adding in /scripts/initializeData.js a new tag group to the array. Then, execute _yarn run:initializeData_ and it creates the new tags groups that doesn't exist yet.

The current implementation specifically creates the Collections Tag Group and allows for automatically removing tag associations from deleted Templates.

## Technical description

The Tagging Service uses MongoDB for saving the tagged objects. You will need a MongoDB, to connect we use Mongoose for object modeling. Mongoose is built on top of the official MongoDB Node.js driver.

SwaggerUI is used to document the API.

## Local installation/development

### Without Docker

- Ensure a local MongoDB Database is running
- Run `npm install` to install dependencies. If dependencies are still reported missing, run `npm install` within the /app/iam-utils/ folder as well
- If using the IAM middleware/features, set the environment variable `INTROSPECT_ENDPOINT_BASIC` to match the respective endpoint used by your used IAM instance.
- Run `npm start`

### With Docker

- Ensure a local MongoDB Database is running
- Build (with `docker build . -t [IMAGENAME]`) or download the docker image
- Run the image with `docker run --network="host" [IMAGENAME]`
- If using the IAM middleware/features, set the environment variables to match those used by your IAM instance by using the `-e` option for `docker run`. For example: `docker run -e "INTROSPECT_ENDPOINT_BASIC=http://localhost:3099/api/v1/tokens/introspect" -t --network="host" [IMAGENAME]`

### Use of IAM permissions.

The Tagging Service makes use of the IAM permission system, and requires appropriate permissions for all flow operations. The two used permissions are:

- `tagging.read` for getting tags and tagged objects. This applies to the endpoints GET `/tags/{tagsGroupSlug}` and GET `/tags/{tagsGroupSlug}/taggedObjects`
- `tagging.write` for creating, updating, or deleting tags and tagged objects. This applies to the end points POST `/tags/{tagsGroupSlug}/upsertTaggedObjects`, POST `/tags/{tagsGroupSlug}`, PATCH `/tags/{tagsGroupSlug}/{id}`, and DELETE `/tags/{tagsGroupSlug}/id`


## REST-API documentation

You have to start the tagging service and visit the url 
http://localhost:{port}/api-docs/ to view the Swagger API-Documentation