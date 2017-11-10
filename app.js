var express = require('express');
var compression = require('compression');
var mongoose = require('mongoose');
var swaggerMongoose = require('swagger-mongoose');
var jwt = require("express-jwt");
var pathToRegexp = require('path-to-regexp');

// ACL. Global variable
acl = require('acl');
var fs = require('fs');
var path = require('path');
var bodyParser = require('body-parser');
var favicon = require('serve-favicon');
var logger = require('morgan');

var schema = fs.readFileSync('./swagger.json');

//Config
var config = require('config');

// Models. Global variable
models = swaggerMongoose.compile(JSON.parse(schema)).models;

// Initialize deep populate plugin
var deepPopulate = require('mongoose-deep-populate')(mongoose);
global.models.FeatureGroup.schema.plugin(deepPopulate);
global.models.Feature.schema.plugin(deepPopulate);
global.models.Testcontent.schema.plugin(deepPopulate);
global.models.Testvector.schema.plugin(deepPopulate);
var mongoose_uri = process.env.MONGOOSE_URI || "172.17.0.2/vrif-db";
var index = require('./routes/index');
var users = require('./routes/users');
var testcontents = require('./routes/testcontents');
var mytestcontents = require('./routes/mytestcontents');
var testvectors = require('./routes/testvectors');
var mytestvectors = require('./routes/mytestvectors');
var attributes = require('./routes/attributes');
var myattributes = require('./routes/myattributes');
var statistics = require('./routes/statistics');
var utils = require('./routes/utils');

var app = express();

//Mongoose DEBUG output is enabled.
mongoose.set('debug', false);
mongoose.Promise = require('q').Promise;
console.log('mongodb://localhost:' + config.dbConfig.port + "/" + config.dbConfig.dbName);
mongoose.connect('mongodb://localhost:' + config.dbConfig.port + "/" + config.dbConfig.dbName, {
  //user: 'dashifadmin',
  //pass: 'test'
});
mongoose.connection.on('error', function (err) {
  console.log('Mongoose connection error');
});
mongoose.connection.once('open', function callback() {
  console.log("Mongoose connected to the database");
  acl = new acl(new acl.mongodbBackend(mongoose.connection.db, config.dbConfig.aclPrefix));
});

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(logger('dev'));
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE");
  if (req.method == 'OPTIONS') {
    res.status(200).end();
  } else {
    next();
  }
  //next();
});

var path = ['/',
  '/v1/users/login',
  '/v1/testcontents',
  '/v1/statistics/size',
  '/v1/statistics/testvector/types',
  '/v1/statistics/testcontents/types',
  new RegExp(pathToRegexp('/v1/testcontents/:id/testvectors')),
  new RegExp(pathToRegexp('/v1/testcontents/:id/details')),
  '/v1/testvectors',
  '/v1/testvectors/groupedlist',
  new RegExp(pathToRegexp('/v1/testvectors/:id/testcontents')),
  new RegExp(pathToRegexp('/v1/testvectors/:id/features')),
  new RegExp(pathToRegexp('/v1/testvectors/:id/details')),
  new RegExp(pathToRegexp('/v1/testvectors/search')),
  '/v1/features',
  '/v1/attributes'
];
// Routes which doesn't require JWT Check
app.use(jwt(
  {
    secret: 'secretword',
    getToken: function fromHeaderOrQuerystring (req) {
      if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        return req.headers.authorization.split(' ')[1];
      }
      return null;
    }
  }).unless({
      path: path
    }
  ));


// Routes which doesn't require
app.use(utils.middleware().unless({
  path: path
}));

app.use('/v1/users/', users);
app.use('/v1/testcontents/', testcontents);
app.use('/v1/mytestcontents/', mytestcontents);
app.use('/v1/testvectors/', testvectors);
app.use('/v1/mytestvectors/', mytestvectors);
app.use('/v1/attributes/', attributes);
app.use('/v1/myattributes/', myattributes);
app.use('/v1/statistics', statistics);

// error handler for all components
app.use(function (err, req, res, next) {

  var errorType = typeof err,
    code = 500,
    message = "Internal Server Error",
    msg = {
      code: code,
      message: message
    };

  switch (err.name) {
    case "UnauthorizedError":
      code = err.status;
      message = undefined;
      break;
    case "BadRequestError":
    case "UnauthorizedAccessError":
    case "NotFoundError":
      code = err.status;
      message = err.inner;
      break;
    default:
      break;
  }

  msg.code = code;
  msg.message = message;
  msg.err = err;
  return res.status(code).json(msg);

});

module.exports = app;
