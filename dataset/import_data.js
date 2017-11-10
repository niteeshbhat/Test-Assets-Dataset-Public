/**
 * Created by danielsilhavy on 15.08.16.
 */

process.env.NODE_CONFIG_DIR = "../config";

var fs = require('fs');
var utils = require('./utils');
var User = utils.models.User;
var Q = require('q');

var role = 'super-admin';
var username = 'vrif-admin';
var password = 'superuser';
var superUser = null;
var featureGroups = [];
var features = [];
var testcontents = [];
var testvectors = [];
var oldFeatures = [];
var oldTestcontents = [];
var oldTestvectors = [];

var dataimporter = {};

String.prototype.capitalizeFirstLetter = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

dataimporter.startImport = function () {
    // We clear the database before we do anything
    utils.conntectToDatabase()
      .then(function () {
          return utils.clearDatabase();
      })
      .then(function () {
          console.log("Cleared Database");
          return dataimporter.setSuperUser();
      })
      .then(function () {
          console.log("Set superuser");
          return dataimporter.importTables();
      })
      .then(function () {
          console.log("Imported Tables");
          return dataimporter.importTestcontents();
      })
      .then(function () {
          console.log("Imported Testcontents");
          return dataimporter.importTestvectors();
      })
      .then(function () {
          console.log("Imported Testvectors")
          dataimporter.removeOldIdField();
          return;
      })
      .catch(function (err) {
          console.log(err);
      })
};

dataimporter.importTables = function () {
    var q = Q.defer();
    var fid;
    var tcid;


        fs.readFile('./data/testcontent.json', function (err, data) {
            if (err) {
                q.reject();
            }
            oldTestcontents = JSON.parse(data);
            // fill the features field with name instead of ids
           /* oldTestcontents.forEach(function (item) {
                fid = item.features['$oid'];
                oldFeatures.forEach(function (f) {
                    if (f._id['$oid'] === fid) {
                        item.feature = f;
                    }
                })
            })*/
            fs.readFile('./data/testvector.json', function (err, data) {
                if (err) {
                    q.reject();
                }
                oldTestvectors = JSON.parse(data);
                    

                // fill the features field with name instead of ids
                oldTestvectors.forEach(function (item) {
                    item.savedTestcontents = [];
                    if (item.testcontents instanceof Array) {
                        item.testcontents.forEach(function (tc) {
                            tcid = tc['$oid'];
                            oldTestcontents.forEach(function (t) {
                                if (t._id['$oid'] === tcid) {
                                    item.savedTestcontents.push(t);
                                }
                            })
                        })
                    } else {
                        tcid = item.testcontents; //somehow the data structure is broken at the end
                        oldTestcontents.forEach(function (t) {
                            if (t._id['$oid'] === tcid) {
                                item.savedTestcontents.push(t);
                            }
                        })
                    }
                })
                q.resolve();
            });
        });



    return q.promise;
};





dataimporter.importTestcontents = function () {
    var q = Q.defer();
    var ignoredAttributes = {'_id': true, 'feature': true, 'features': true, 'name': true, 'createdby': true};
     
    dataimporter.createAttributesForModel(oldTestcontents, ignoredAttributes, 'Testcontent')
      .then(function (attributes) {
          return dataimporter.createTestcontentInstances(attributes)
      })
      .then(function () {
          q.resolve();
      })
      .catch(function (err) {
          q.reject(err);
      })

    return q.promise;
};

dataimporter.importTestvectors = function () {
    var q = Q.defer();
    var ignoredAttributes = {
        '_id': true,
        'url': true,
        'testcontents': true,
        'savedTestcontents': true,
        'name': true,
        'createdby': true,
        '__v': true
    };

    dataimporter.createAttributesForModel(oldTestvectors, ignoredAttributes, 'Testvector')
      .then(function (attributes) {
          return dataimporter.createTestvectorInstances(attributes)
      })
      .then(function () {
          q.resolve();
      })
      .catch(function (err) {
          q.reject(err);
      })

    return q.promise;
};



dataimporter.createTestcontentInstances = function (attributes) {
    var q = Q.defer();
    var testcontent;
    var promises = [];
    var now = new Date();
    var i = 0;

    oldTestcontents.forEach(function (item) {
   
        i = 0;
        testcontent = {};
        testcontent.name = item.name;
        testcontent.createdby = superUser._id;
        testcontent.active = true;
        testcontent.createdAt = now;
        testcontent.updatedAt = now;
        testcontent.oldId = item._id['$oid']; // This is ugly but the fastest way to not lose the references when we create the testvectors. We have to delete that attribute in the end
        testcontent.attributeInstances = [];
        attributes.forEach(function (attr) {
            if (attr.type === 'Testcontent') {
                //create an attribute instance for each attribute
                testcontent.attributeInstances.push({
                    value: item[attr.description],
                    attribute: attr._id
                })
            }
        })
        // Insert with the right feature
        if (item.feature) {
            while (i < features.length) {
                if (item.feature.name === features[i].name) {
                    testcontent.feature = [features[i]._id];
                    break;
                }
                i++;
            }
        }
        promises.push(dataimporter.createSingleInstance(testcontent));
    });
    Q.all(promises)
      .then(function (instances) {
          return dataimporter.createTestContentEntries(instances)
      })
      .then(function (data) {
          testcontents = data;
          q.resolve();
      })
      .catch(function (err) {
          q.reject(err);
      });


    return q.promise;
};

dataimporter.createTestvectorInstances = function (attributes) {
    var q = Q.defer();
    var testvector;
    var promises = [];
    var now = new Date();
    var i = 0;

    oldTestvectors.forEach(function (item) {
        //console.log(item)
        i = 0;
        testvector = {};
        testvector.name = item.name;
        testvector.createdby = superUser._id;
        testvector.active = true;
        testvector.url = item.url;
        testvector.attributeInstances = [];
        testvector.createdAt = now;
        testvector.updatedAt = now;
        testvector.testcontents = [];
        attributes.forEach(function (attr) {
            if (attr.type === 'Testvector') {
                //create an attribute instance for each attribute
                testvector.attributeInstances.push({
                    value: item[attr.description],
                    attribute: attr._id
                })
            }
        })
        
        // Insert with the right testcontents
        item.savedTestcontents.forEach(function (tc) {
            while (i < testcontents.length) {
                if (tc._id['$oid'] === testcontents[i].oldId) {
                    testvector.testcontents.push(testcontents[i]._id);
                    break;
                }
                i++;
            }
            i = 0;
        });
        promises.push(dataimporter.createSingleInstance(testvector));
    });
    Q.all(promises)
      .then(function (instances) {
          return dataimporter.createTestVectorEntries(instances)
      })
      .then(function (data) {
          testvectors = data;
          q.resolve();
      })
      .catch(function (err) {
          q.reject(err);
      });


    return q.promise;
};

dataimporter.createSingleInstance = function (instance) {
    var q = Q.defer();

    dataimporter.createAttributeInstanceEntries(instance.attributeInstances)
      .then(function (docs) {
          instance.attributeInstances = [];
          docs.forEach(function (data) {
              instance.attributeInstances.push(data._id);
          })
          q.resolve(instance)
      })
      .catch(function (err) {
          q.reject(err);
      })
    return q.promise;
};

dataimporter.createAttributesForModel = function (elements, ignoredAttributes, type) {
    var attributes = [];
    var attributeNames = {};
    var now = new Date();

    elements.forEach(function (item) {
        for (var key in item) {
            if (item.hasOwnProperty(key)) {
                if (!attributeNames[key] && !ignoredAttributes[key]) {
                    attributeNames[key] = key;
                    attributes.push({
                        description: key,
                        uiName: key,
                        active: true,
                        shownByDefault: true,
                        type: type,
                        defaultValue: '',
                        createdby: superUser._id,
                        createdAt: now,
                        updatedAt: now,
                        deletable: true
                    })
                }
            }
        }
    });
    return dataimporter.createAttributeEntries(attributes);
};

dataimporter.setSuperUser = function () {
    var q = Q.defer();

    User.findOne({'username': username})
      .then(function (data) {
          superUser = data;
          q.resolve();
      })
      .catch(function (err) {
          q.reject(err);
      });

    return q.promise;
};


dataimporter.createAttributeEntries = function (attributes) {
    var q = Q.defer();

    utils.models.Attribute.collection.insert(attributes, {}, function (err, docs) {
        err ? q.reject(err) : q.resolve(docs.ops);
    });
    return q.promise;
};



dataimporter.createAttributeInstanceEntries = function (attributeInstances) {
    var q = Q.defer();

    utils.models.AttributeInstance.collection.insert(attributeInstances, {}, function (err, docs) {
        err ? q.reject(err) : q.resolve(docs.ops);
    });
    return q.promise;
};

dataimporter.createTestContentEntries = function (testcontents) {
    var q = Q.defer();

    utils.models.Testcontent.collection.insert(testcontents, {}, function (err, docs) {
        err ? q.reject(err) : q.resolve(docs.ops);
    });
    return q.promise;
};

dataimporter.createTestVectorEntries = function (testvectors) {
    var q = Q.defer();

    utils.models.Testvector.collection.insert(testvectors, {}, function (err, docs) {
        err ? q.reject(err) : q.resolve(docs.ops);
    });
    return q.promise;
};



dataimporter.removeOldIdField = function () {
    utils.models.Testcontent.collection.update({}, {$unset: {oldId: 1}}, {multi: true});
};

dataimporter.startImport();