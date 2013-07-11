#!/usr/bin/env node
/*
Automatically grade files for the presence of specified HTML tags/attributes.
Uses commander.js and cheerio. Teaches command line application development
and basic DOM parsing.

References:

 + cheerio
   - https://github.com/MatthewMueller/cheerio
   - http://encosia.com/cheerio-faster-windows-friendly-alternative-jsdom/
   - http://maxogden.com/scraping-with-node.html

 + commander.js
   - https://github.com/visionmedia/commander.js
   - http://tjholowaychuk.com/post/9103188408/commander-js-nodejs-command-line-interfaces-made-easy

 + JSON
   - http://en.wikipedia.org/wiki/JSON
   - https://developer.mozilla.org/en-US/docs/JSON
   - https://developer.mozilla.org/en-US/docs/JSON#JSON_in_Firefox_2
*/

var util = require('util');
var rest = require('restler');
var fs = require('fs');
var program = require('commander');
var cheerio = require('cheerio');
var CHECKSFILE_DEFAULT = "checks.json";

var assertFileExists = function(infile) {
    var instr = infile.toString();
    if(!fs.existsSync(instr)) {
        console.log("%s does not exist. Exiting.", instr);
        process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
    }
    return instr;
};

var assertValidUrl = function(inUrl) {
  var url = inUrl.toString();
  if(!validUrl(url)) {
    console.error('Error: Invalid url');
    process.exit(1);
  }
  return url;
};

// https://forums.digitalpoint.com/threads/javascript-validation-for-url.242636/
function validUrl(url){
  return url.match(/^(ht|f)tps?:\/\/[a-z0-9-\.]+\.[a-z]{2,4}\/?([^\s<>\#%"\,\{\}\\|\\\^\[\]`]+)?$/);
}

var loadChecks = function(checksfile) {
    return JSON.parse(fs.readFileSync(checksfile));
};

var checkHtml = function(html, checksfile) {
    $ = cheerio.load(html);
    var checks = loadChecks(checksfile).sort();
    var out = {};
    for(var ii in checks) {
        var present = $(checks[ii]).length > 0;
        out[checks[ii]] = present;
    }
    return out;
};

var clone = function(fn) {
    // Workaround for commander.js issue.
    // http://stackoverflow.com/a/6772648
    return fn.bind({});
};

var processUrl = function(checksfile) {
  return function(result, response) {
    if (result instanceof Error) {
      console.error('Error: ' + util.format(response.message));
      process.exit(1);
    } else {
      if(response.statusCode == 200) {
        displayHtmlChecks(result, checksfile);
      } else {
        console.log('Error: ' + response.statusCode);
      }
    }
  };
};

var displayHtmlChecks = function(html, checksfile) {
  var checkJson = checkHtml(html, checksfile);
  var outJson = JSON.stringify(checkJson, null, 4);
  console.log(outJson);
};

if(require.main == module) {
    program
        .option('-c, --checks <check_file>', 'Path to checks.json', clone(assertFileExists), CHECKSFILE_DEFAULT)
        .option('-f, --file <html_file>', 'Path to html file', clone(assertFileExists))
        .option('-u, --url <url>', 'Url for html file', clone(assertValidUrl))
        .parse(process.argv);
    if(program.file) {
      html = fs.readFileSync(program.file);
      displayHtmlChecks(html, program.checks);
    }
    if(program.url) {
      rest.get(program.url).on('complete', processUrl(program.checks));
    }
} else {
    exports.checkHtmlFile = checkHtmlFile;
}
