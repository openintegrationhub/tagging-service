## Tagging Service

This repo contains the Tagging Service, originally created for the OIH Platform. It may be used to tag/label other objects in the Framework Services, providing a system for categorization outside of object parameters.

In this service, users can create one or many Tag Groups that can be applied to other object types in the system. Under each Tag Group, Tags can then be created and specific objects may be tagged with one or many tags. (many-many relationship). Right now, if you want to create a new Tag Group, you have to do manually in database or adding in /scripts/initializeData.js a new tag group to the array. Then, execute _yarn run:initializeData_ and it creates the new tags groups that doesn't exist yet.

The current implementation specifically creates the Collections Tag Group and allows for automatically removing tag associations from deleted Templates.