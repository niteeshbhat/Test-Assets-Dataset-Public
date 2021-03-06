var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var utils = require('./utils');
var _ = require('lodash');
var Testvector = global.models.Testvector;
var User = global.models.User;
var ObjectId = mongoose.Types.ObjectId;
var BadRequestError = require('../errors/BadRequestError');

/**
 * GET a list of testvectors which belongs to the owner. User ID is fetched from JWT token
 */
router.get('/', function (req, res, next) {
    var id = req.user._id;
    var requestOptions;
    var username;
    var roles;

    if (_.isEmpty(id)) {
        return next(new BadRequestError('empty_data', 'User ID cannot be empty.'));
    }

    requestOptions = { createdby: ObjectId(id) };
    User.findOne({ _id: id }, 'username')
      .then(function (result) {
          username = result.username;
          return global.acl.userRoles(username)
      })
      .then(function (data) {
          roles = data || [];
          for (var i = 0; i < roles.length; i++) {
              if (roles[i] === 'superuser') {
                  // If its a superuser he sees everything
                  requestOptions = {};
              }
          }
          return Testvector.find(requestOptions).deepPopulate('testcontents attributeInstances attributeInstances.attribute')
      })
      .then(function (docs) {
          return res.status(200).json(docs);
      })
      .catch(function (err) {
          next(err);
      })
});

/**
 *  Adds a testvector object to Feature collection.
 *  Expects the payload of the attribute instances to be in the form [{attribute._id,value},{attribute._id,value}]
 */
router.post('/', utils.checkPermissions("testvectors", "create"), function (req, res, next) {
    var testvector;
    var data = {};
    var attributeInstanceIds = [];
console.log("i should be here")
    if (_.isEmpty(req.body)) {
        return next(new BadRequestError('empty_data', 'Post data cannot be empty.'));
    }

    try {
        // we need to save the new attribute instances first and assign them to the new item
        data = req.body;
        if (!data.attributeInstances) {
            data.attributeInstances = [];
        }
        utils.insertManyAttributeInstances(data.attributeInstances)
          .then(function (docs) {
              docs.forEach(function (item) {
                  attributeInstanceIds.push(item._id.toString());
              });
              data.attributeInstances = attributeInstanceIds;
              testvector = new Testvector(data);
              testvector.save(function (err) {
                  if (err) next(err);

                  // update dshja.json
                  utils.writeFeatureTestVectorJSON();

                  return res.status(200).json(testvector);
              });
          })
    }
    catch (e) {
        return next(e);
    }
});

module.exports = router;