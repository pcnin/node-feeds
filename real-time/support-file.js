#!/usr/bin/env node

"use strict";

/**********************************************************/
/*                      Librerías                         */
/**********************************************************/
var findRemoveSync = require('find-remove'),
    result = findRemoveSync( __dirname + '/temp', {age: {seconds: 14400}, extensions: '.txt'});

console.log( result );