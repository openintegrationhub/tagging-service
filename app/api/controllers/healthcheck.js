const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const jsonParser = bodyParser.json();
const router = express.Router();

router.get('/', jsonParser, async (req, res) => {
  // Initialises the response object on fail statuses
  const response = {
    status: 'fail',
    version: '0.0.6',
    details: {
      mongoDB: {
        status: 'fail',
      },
    },
  };

  // Checks each component for health
  if (mongoose.connection.readyState === 1) {
    response.details.mongoDB.status = 'pass';
  }

  // If all components are healthy, set overall health to pass
  if (response.details.mongoDB.status === 'pass') {
    response.status = 'pass';
  }

  if (response.status === 'pass') {
    return res.status(200).send(response);
  }
  return res.status(500).send(response);
});

module.exports = router;
