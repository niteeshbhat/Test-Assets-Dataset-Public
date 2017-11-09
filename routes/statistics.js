/**
 * Created by danielsilhavy on 05.09.16.
 */
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var utils = require('./utils');
var Q = require('q');
var BadRequestError = require('../errors/BadRequestError');
var Attribute = global.models.Attribute;
var AttributeInstance = global.models.AttributeInstance;
var Testcontent = global.models.Testcontent;
var Testvector = global.models.Testvector;

/**
 * Public call
 * GET a list of all attributes
 * @params {string} [type] - The type of the attribute e.g feature
 */
router.get('/size', function (req, res, next) {
    var result = {};
    var promises = [];

    promises.push(Attribute.count({active:true}));
    promises.push(Testcontent.count({active:true}));
    promises.push(Testvector.count({active:true}));
    Q.all(promises)
      .then(function (docs) {
          result.attributes = docs[0];
          result.testcontents = docs[1];
          result.testvectors = docs[2];
          return res.status(200).json(result);
      })
      .catch(function (err) {
          next(err);
      })
});

router.get('/testvector/types', function (req, res, next) {
    Testvector.find({active:true}).deepPopulate('testcontents')
      .then(function (docs) {
          return res.status(200).json(docs);
      })
      .catch(function (err) {
          next(err);
      })
});

router.get('/testcontents/types', function (req, res, next) {
    Testcontent.find({active:true})
      .then(function (docs) {
          return res.status(200).json(docs);
      })
      .catch(function (err) {
          next(err);
      })
});



module.exports = router;