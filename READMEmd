# yeetboard - An Online Multi-Player Whiteboarding Application

I've attempted to give users freedom to draw, shapes or free-hand. With customizability of the elements they create on empty canvas while being able to collaborate with friends with just ONE-CLICK!

# Overview video (Optional)

Here's a short demo video that shows how the App works & also what are features available on this app

![youtube video https://www.youtube.com/watch?v=RPY1qSU9tjw showing features of the application](https://www.youtube.com/watch?v=RPY1qSU9tjw)

## How it works

To give an overview, the app uses WebSockets with a separate NestJS server () to communicate any "ACTION"s that user takes & that "ACTION" is emitted to all of the users who are connected to the same room (Rooms API of Socket.IO is utilised for managing rooms).

> What's an ACTION?<br>
> ACTION is a JSON object stored locally (in-memory) & emitted to all roommates. This JSON object contains things like the type of action ("OBJECT_ADDED" or "OBJECT_MODIFIED" etc.) and other necessary data enough for the other user to generate the object by itself on their end.

This ACTION-BASED approach prevents race-conditions as for each new action whether its about an object being deleted, added or modified, we're just appending the action to an array of action in Redis Database for that room id.

Any user which joins the room, on joining it recieves an event "LOAD_CANVAS" which contains all the actions done till now so that the user can just build the actions array on their end locally.

Also, the websocket server keeps a check on disconnecting users, whenever a user leaves & a room is empty, the server deletes the actions array stored in RedisJSON database. As the action-based approach is storage-hungry, this ensures database is not depleted of available of space unnecessarily.

BASICALLY, the RedisJSON database here acts as a session storage for the ongoing whiteboarding session.

CONS of this action-based approach:

- storage hungry

As the size of the document keeps on increasing with every action taken by the user/

## How to run it locally?

- Clone the repo
- Do `pnpm i`
- Run on dev mode with `pnpm dev`

This will run the React App, to run the Websocket server:

- Clone the repo: https://github.com/kuvamdazeus/yeetboard-nestjs
- Install dependencies with `yarn`
- Run in dev mode with `yarn dev`

## .env file variables

For React App:

```
VITE_SOCKET_SERVER = http://localhost:3001
```

For Nest App (Websocket server):

```
REDIS_URL = "redis-database-url-goes-here"
PORT = 3001 # remove this variable in production
```
