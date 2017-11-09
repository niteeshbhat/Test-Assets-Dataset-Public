/**
 * Created by danielsilhavy on 17.06.16.
 */

process.env.NODE_CONFIG_DIR = "../config";


var bcrypt = require('bcryptjs');
var swaggerMongoose = require('swagger-mongoose');
var fs = require('fs');
var swagger = fs.readFileSync('../swagger.json');
var config = require('config');
var mongoose = require('mongoose');
var models = swaggerMongoose.compile(swagger).models;
var Q = require('q');
var acl = require('acl');
var User = models.User;
var utils = {};

utils.models = models;
utils.acl = null;
utils.testUser = null; // this will be the sample user which we use for all the CRUD stuff
utils.sampleData = {}; // we store some sample data for our tests here

utils.conntectToDatabase = function () {
    var q = Q.defer();
    var mongooseUri = config.dbConfig.host + ':' + config.dbConfig.port + '/' + config.dbConfig.dbName;

    mongoose.set('debug', false);
    mongoose.connect(mongooseUri);
    mongoose.connection.on('error', function () {
        q.reject();
    });
    mongoose.connection.once('open', function callback() {
        utils.acl = new acl(new acl.mongodbBackend(mongoose.connection.db, config.dbConfig.aclPrefix));
        q.resolve();
    });
    return q.promise;
};

utils.addUserRoles = function () {
    return utils.acl.allow([
        {
            roles: ['superuser'],
            allows: [
                {
                    resources: ['testcontents', 'testvectors', 'users', 'attributes'],
                    permissions: ['create', 'read', 'update', 'delete']
                }
            ]
        },
        {
            roles: ['admin'],
            allows: [
                {
                    resources: ['testcontents', 'testvectors',  'users', 'attributes'],
                    permissions: ['create', 'read', 'update', 'delete']
                }
            ]
        },
        {
            roles: ['member'],
            allows: [
                {
                    resources: ['testcontents', 'testvectors'],
                    permissions: ['create', 'read', 'update', 'delete']
                }
            ]
        }
    ])
};

utils.createUser = function (name, password, role) {
    var q = Q.defer();
    var hash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
    var user = new User({
        username: name,
        password: hash
    });

    utils.acl.addUserRoles(name, role)
      .then(function () {
          user.save(function (err) {
              if (err) {
                  q.reject(err);
              } else {
                  utils.testUser = user;
                  utils.testUser.name = name;
                  utils.testUser.password = password;
                  utils.testUser.role = role;
                  q.resolve(user);
              }
          })
      });
    return q.promise;
};

utils.clearDatabase = function () {
    var q = Q.defer();

    try {
            mongoose.connection.db.dropCollection('testvectors', function () {
                mongoose.connection.db.dropCollection('testcontents', function () {
                        mongoose.connection.db.dropCollection('attributes', function () {
                            mongoose.connection.db.dropCollection('attributeinstances', function () {
                                q.resolve();
                            })
                        })
                    
                });
            });
        
    }
    catch (e) {
        q.reject(e);
    }
    return q.promise;
};

module.exports = utils;
