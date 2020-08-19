'use strict';

var constants = require('../utils/constants.js');

module.exports = {
  register: {
    type: 'object',
      properties: {
        fName: {
          type: "string"
        },
        lName: {
          type: "string"
        },
        phoneNo: {
          type: "number"
        },
        email: {
          type: "string"
        },
        dappName: {
          type: "string"
        },
        assetType: {
          type: "string"
        },
        countryCode: {
          type: 'string',
          minLength: 2,
          maxLength: 2
        }
      },
      required: ['fName', 'lName', 'email', 'phoneNo', 'dappName', 'countryCode']
  }
};
