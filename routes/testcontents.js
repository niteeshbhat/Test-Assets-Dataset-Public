var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var utils = require('./utils');
var _ = require('lodash');
var Testcontent = global.models.Testcontent;
var Testvector = global.models.Testvector;
var ObjectID = mongoose.Types.ObjectId;
var BadRequestError = require('../errors/BadRequestError');
var InternalError = require('../errors/InternalError');

global.models.Testcontent.schema.pre('save', function (next) {
    var now = new Date();
    if (!this.createdAt) {
        this.createdAt = now;
    }
    next();
});

/**
 * Public method
 * GET all testcontents with all attributes, public method
 */
router.get('/', function (req, res, next) {
    console.log("i am in testcontent")
    Testcontent.find().deepPopulate('attributeInstances attributeInstances.attribute')
      .then(function (docs) {
          return res.status(200).json(docs);
      })
      .catch(function (err) {
          next(err);
      })
});

/**
 * Public method
 * GET details of a testcontent by id.
 * @param {string} id
 */
router.get('/:id/details', function (req, res, next) {
    var id = req.params.id;
    var response = {};

    if (_.isEmpty(id)) {
        return next(new BadRequestError('empty_data', 'Feature Group ID cannot be empty.'));
    }

    Testcontent.findById(id).deepPopulate('attributeInstances attributeInstances.attribute')
      .then(function (docs) {
          response.testcontent = docs;
          return Testvector.find({testcontents: {$in: [id]}}).deepPopulate('testcontents');
      })
      .then(function (docs) {
          response.testvectors = docs;
          return res.status(200).json(response);
      })
      .catch(function (err) {
          next(err);
      })
});

/**
 * Restricted call
 * GET a testcontent by id.
 * @param {string} id
 */
router.get('/:id', utils.checkPermissions("testcontents", "read"), function (req, res, next) {
    var id = req.params.id;

    if (_.isEmpty(id)) {
        return next(new BadRequestError('empty_data', 'Testcontent ID cannot be empty.'));
    }

    Testcontent.findById(id).deepPopulate('attributeInstances attributeInstances.attribute')
      .then(function (docs) {
          return res.status(200).json(docs);
      })
      .catch(function (err) {
          next(err);
      })
});

/**
 * @param {string} id - ID of the testcontent
 * GET all the testvectors which have the desired testcontent id
 */
router.get('/:id/testvectors', function (req, res, next) {
    var id = req.params.id;

    if (_.isEmpty(id)) {
        return next(new BadRequestError('empty_data', 'Feature ID cannot be empty.'));
    }
    try {
        Testvector.find({testcontents: {$in: [id]}}).deepPopulate('attributeInstances attributeInstances.attribute')
          .then(function (docs) {
              return res.status(200).json(docs);
          })
          .catch(function (err) {
              next(err);
          })
    }
    catch (err) {
        next(err)
    }
});
/**
 * Restricted call
 * Update a testcontent by id.
 * Expects the payload of the attribute instances to be in the form [{._id,value},{._id,value}]
 * @param {string} id
 */
router.put('/:id', utils.checkPermissions("testcontents", "update"), function (req, res, next) {
    var id = req.params.id;
    var data;
    var now = new Date();

    if (_.isEmpty(id)) {
        return next(new BadRequestError('empty_data', 'Testcontent ID cannot be empty.'));
    }
    // Update the attributeInstances first
    data = req.body;
    if (!data || !data.attributeInstances) {
        data.attributeInstances = [];
    }
    data.updatedAt = now;
    utils.updateManyAttributeInstances(data.attributeInstances)
      .then(function (result) {
          // update and return the element
          return Testcontent.findOneAndUpdate({_id: id}, {
              "$set": {
                  "name": data.name,
                  "active": data.active,
                  "includeInDashjsJson": data.includeInDashjsJson,
                  "feature": data.feature,
                  "updatedAt": data.updatedAt
              }
          }, {new: true}).deepPopulate('attributeInstances attributeInstances.attribute')
      })
      .then(function (result) {
          utils.writeFeatureTestVectorJSON();
          return res.status(200).json(result);
      })
      .catch(function (err) {
          next(err)
      })
});

/**
 Delete Test Case by Test Case ID clear records from Test Vectors and Features
 Only authorized user can access this method.
 */
router.delete('/:id', utils.checkPermissions("testcontents", "delete"), function (req, res, next) {
    var id = req.params.id;
    var attributeInstancesIds;

    if (_.isEmpty(id)) {
        return next(new BadRequestError('empty_data', 'Feature Group ID cannot be empty.'));
    }
    // Delete all attributes of the element, afterwards delete the element
    Testcontent.findById(id)
      .then(function (doc) {
          attributeInstancesIds = doc.attributeInstances || [];
          return utils.deleteManyAttributeInstances(attributeInstancesIds)
      })
      .then(function () {
          return Testcontent.findByIdAndRemove({_id: id})
      })
      .then(function (result) {
          utils.writeFeatureTestVectorJSON();
          res.status(200).json(result)
      })
      .catch(function (err) {
          next(err)
      })
});

module.exports = router;