# Emulated node_modules
This folder is here just because we are inside the `event-pubsub` module and we can not properly emulate an app's node_modules without going a dir above the `index.js` which is already in the root of this server.

For development purposes, there is an npm script that will echo out the commands to copy the relevant files after you run an `npm i` in the root of the module. This will ensure that the examples always have the current version of `index.js` and the dependancy `strong-type`