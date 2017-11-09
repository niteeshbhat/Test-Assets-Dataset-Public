# Overview (DRAFT)

## General Infrastructure Architecture

![](https://github.com/waqarz/VR-IF-Database/blob/master/doc/diagrams/vr-if-test-assets-dataset-architecture.png)

## Test-Assets-Dataset REST API Structure and Data Flow

![](https://github.com/waqarz/VR-IF-Database/blob/master/doc/diagrams/vr-if-test-assets-dataset-rest-api-architecture.png)

## Components

**VR-IF Test-Asset-UI** - Is User interface or REST API client. Provides ability to view Test Assets as well as gain authorized access to maintain test assets for it's members as well as maintaining users database for Administrators. Source: [https://github.com/waqarz/VR-IF-FE](https://github.com/waqarz/VR-IF-FE). It connects directly to REST API end point. Behind that is ExpressJS router component. 

**Router** - REST API Routing is based on [Express](http://expressjs.com/). Express is a minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications. Routing refers to determining how an application responds to a client request to a particular endpoint, which is a URI (or path) and a specific HTTP request method (GET, POST, and so on).

Each route can have one or more handler functions, which are executed when the route is matched. see [Basic routing](http://expressjs.com/en/starter/basic-routing.html).

**Middleware** - [Middleware](http://expressjs.com/en/guide/writing-middleware.html) functions are functions that have access to the request object `(req)`, the response object `(res)`, and the next middleware function in the application’s request-response cycle. The next middleware function is commonly denoted by a variable named next.

Middleware functions can perform the following tasks:

* Execute any code.
* Make changes to the request and the response objects.
* End the request-response cycle.
* Call the next middleware in the stack.

If the current middleware function does not end the request-response cycle, it must call `next()` to pass control to the next middleware function. Otherwise, the request will be left hanging.

**Body parser** - exposes various factories to create middlewares. All middlewares will populate the `req.body` property with the parsed body, or an empty object (`{}`) if there was no body to parse (or an error was returned).

**JWT** - Middleware that validates [JsonWebTokens](https://jwt.io/) and sets `req.user`.

This module lets you authenticate HTTP requests using JWT tokens in your Node.js applications. JWTs are typically used to protect API endpoints.

The JWT authentication middleware authenticates callers using a JWT. If the token is valid, req.user will be set with the JSON object decoded to be used by later middleware for authorization and access control.

**Utils** - Middleware that provides log in / log out functionality as well as access to ACL functionality to verify users permissions. In case we need to restrict access to DASH-IF Members, DASH-IF Admins or provide public access to less restricted resources.

**Routes** - protected by ACL or public routes are actual business logic implementation and implements data retrieval / update or deletion. It connects directly to MongoDB Database and use Utils middleware to verify users policy before an actual action will be performed.

**Data models** - A data model is an abstract model that organizes elements of data and standardizes how they relate to one another and to properties test assets. Ours data models explicitly determines the structure of data which is described in `swagger.json` see section [definitions](https://github.com/waqarz/VR-IF-Database/blob/master/swagger.json).

**MongoDB Database** - Stand alone MongoDB server. Currently single instance with regular backups. We use [Mongoose](http://mongoosejs.com/) which provides a straight-forward, schema-based solution to model our application data. It includes built-in type casting, validation, query building, business logic hooks and more, out of the box.

## Authentication and Authorization

### Users roles

Currently we have 3 types of users: 

* Public users 
* VR-IF Member
* VR-IF Administrator.

**Public** - Public users doesn't require any permissions to get Test Assets (Test Vectors, Test Contents). All other operations are not permitted. Public users not able to create test contents, delete it or edit it respectively. 

**VR-IF Member** - Permitted to create Test Assets (Test Vectors, Test Contents). Such roles permits view it's own existing assets. Currently it is located under "My Test Vectors" Tab in VR-IF Test-Assets-UI. User is required to log in via VR-IF Test-Assets-UI or via VR-IF Test-Assets-Dataset REST API to get access to dedicated area for managing Test Assets.

**VR-IF Admin** - Is a user which has access to Users list. It also permitted to add new user or delete and edit existing ones.

### Access Control List

Create roles and assign roles to users. Sometimes it may even be useful to create one role per user, to get the finest granularity possible, while in other situations you will give the asterisk permission for admin kind of functionality.

A Redis, MongoDB and In-Memory based backends are provided built-in in the module. There are other third party backends such as knex based and firebase. There is also an alternative memory backend that supports regexps.

Learn more about complete feature list at [NODE-ACL](https://github.com/optimalbits/node_acl)

### Authentication Token

We use JSON Web Tokens (JWT) which is an open, industry standard RFC 7519 method for representing claims securely between various client and server.

JWT example:

    {
      "_id": "575094556c3a16f112eef100",
      "username": "vrif-admin",
      "roles": [
        "admin",
        "member"
      ],
      "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJfaWQiOiI1NzUwOTQ1NTZjM2ExNmYxMTJlZWYxMDAiLCJ1c2VybmFtZSI6ImRhc2hpZi1hZG1pbiIsInJvbGVzIjpbImFkbWluIiwibWVtYmVyIl0sImlhdCI6MTQ2NDk4NzMxMywiZXhwIjoxNDY0OTkwOTEzfQ.5Z8A6p_LUFmgdUSEsx0VTDsIuOLORw1Q_VYFr0pBlqc",
      "token_exp": 1464990913,
      "token_iat": 1464987313
    }
    
| Property name | Description |
|---------------|-------------|
| id | User id |
| username | Current user name |
| roles | Array contains user roles |
| token | Actual token consist of header.payload.signature |
| token_exp | Until when is the token valid (unix timestamp) |
| token_iat | Is when the token was created (unix timestamp) |


## Routes

It connects directly to MongoDB Database and use Utils middleware to verify users policy before an actual action will be performed.

Located at [Test-Assets-Dataset/routes](https://github.com/waqarz/VR-IF-Database/tree/master/routes)

| Method | Route | Description | Access |
|--------|-------|-------------|--------|
| GET | /testvectors/ | Gets Test Vector Objects | Public |
| GET | /testvectors/id | Gets Test Vector Object by id | Member, Admin |
| PUT | /testvectors/id | Updates Test Vector Object by id | Member, Admin |
| DELETE | /testvectors/id | Deletes Test Vector Object by id | Member, Admin |
| GET | /mytestvectors/ | Gets current logged in user Test Vector Objects | Member, Admin |
| POST | /mytestvectors/ | Create new Test Vector Object | Member, Admin |
| GET | /testcontents/ | Gets Test Content Objects | Public |
| GET | /testcontents/id | Gets Test Content Object by id | Member, Admin |
| PUT | /testcontents/id | Updates Test Content Object by id | Member, Admin |
| DELETE | /testcontents/id | Deletes Test Content Object by id | Member, Admin |
| GET | /mytestcontents/ | Gets current logged in user Test Content Objects | Member, Admin |
| POST | /mytestcontents/ | Create new Test Content | Member, Admin |
| POST | /users/login | Login user, performs authentication / authorization. Returns JWT Token | Public |
| GET | /users/ | Gets User Objects | Admin |
| GET | /users/id | Get User Object by id | Admin |
| PUT | /users/id | Create new User Object | Admin |
| DELETE | /users/id | Deletes User Object by id | Admin |

## Database

Data model is outlined in [swagger.json](https://github.com/waqarz/VR-IF-Database/blob/master/swagger.json#L533).
