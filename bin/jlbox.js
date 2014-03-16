#!/usr/bin/env node

'use strict';
var fs     = require('fs');
var args   = process.argv.slice(2);
var async  = require('async');
var mkdirp = require('mkdirp');
var chalk  = require('chalk');
var cp     = require('child_process');
var path   = require('path');
var JLBOX  = 'JLBOX_MODULE';

function printHelp() {
  console.log('The following commands are supported:');
  console.log('  init     Bootstrap project with gulp-related files');
  console.log('  module   Add module and test files');
}

function initJulia(callback) {
  async.parallel([
    function(cb) {
      console.log(chalk.cyan('create:') + ' gulp.jl');
      copyFile(__dirname+'/../src/gulp.jl', process.cwd()+'/gulp.jl', cb);
    },
    function(cb) {
      console.log(chalk.cyan('create:') + ' gulpfile.js');
      copyFile(__dirname+'/../src/gulpfile.js', process.cwd()+'/gulpfile.js', cb);
    },
    // add test dir and helper file
    function(cb) {
      console.log(chalk.cyan('create:') + ' test' + path.sep);
      mkdirp(process.cwd()+'/test', function(err) {
        if (err) {
          cb(err);
        }
        else {
          console.log(chalk.cyan('create:')+' test'+path.sep+'helper.jl');
          copyFile(__dirname+'/../src/templates/helper.jl', process.cwd()+'/test/helper.jl', cb);
        }
      });
    },
    function(cb) {
      console.log(chalk.cyan('create:') + ' src' + path.sep);
      mkdirp(process.cwd()+'/src', cb);
    },
    // install gulp and zmq node packages
    function(cb) {
      // if package.json doesn't exist, make it
      fs.exists(process.cwd()+'/package.json', function(fileExists) {
        function setupNPMModules(cb2) {
          console.log(chalk.cyan('Installing npm modules: zmq, gulp, gulp-util'));
          return async.map(['zmq', 'gulp', 'gulp-util'], spawnNPM, cb2);
        }
        if (fileExists) {
          return setupNPMModules(cb);
        }
        else {
          return fs.writeFile(process.cwd()+'/package.json',"{\n}\n", 'utf8', function(err) {
            if (err) return cb(err);
            console.log(chalk.cyan('create:') + ' package.json' );
            return setupNPMModules(cb);
          });
        }
      });
    },
    // append node_modules to .gitignore
    function(cb) {
      console.log(chalk.cyan('append: `node_modules` to .gitignore'));
      var stream = fs.createWriteStream(process.cwd()+'/.gitignore', {flags: 'a'});
      stream.once('open', function(fd) {
        stream.write("node_modules\n");
        stream.end();
        cb(null, true);
      });
    }
  ],
  function(err, res) {
    return callback(err, res);
  });
}

function spawnNPM(app, cb) {
  var args;
  var child;
  if (/^win/.test(process.platform)) {
    args  = ['/S', '/C', 'npm', 'install', app, '--save-dev'];
    child = cp.spawn('cmd', args, {cwd: process.cwd(), stdio: 'inherit'});
  }
  else {
    args  = ['install', app, '--save-dev'];
    child = cp.spawn('npm', args, {cwd: process.cwd(), stdio: 'inherit'});
  }

  child.on('close', function(data) {
    cb(null);
  });
}

function setupModule(moduleName, cb) {
  // setup module file
  async.parallel([
    function(cb2) {
      console.log(chalk.cyan('create: ')+path.normalize(process.cwd()+'/src/'+moduleName+'.jl'));
      copyReplaceFile(__dirname+'/../src/templates/jlbox.jl', process.cwd()+'/src/'+moduleName+'.jl', moduleName, cb2);
    },
    function(cb2) {
      console.log(chalk.cyan('create: ')+path.normalize(process.cwd()+'/test/'+moduleName+'_test.jl'));
      copyReplaceFile(__dirname+'/../src/templates/jlbox_test.jl', process.cwd()+'/test/'+moduleName+'_test.jl', moduleName, cb2);
    }
  ],function(err, res) {
    cb(err, res);
  });
}

function copyReplaceFile(source, target, moduleName, cb) {
  fs.readFile(source, 'utf8', function(err, res) {
    if (err) {
      cb(err);
    }
    else {
      var content = res.replace(new RegExp(JLBOX, 'g'), moduleName);

      fs.writeFile(target, content, 'utf8', function(err) {
        cb(err);
      });
    }
  });
}

function copyFile(source, target, cb) {
  var cbCalled = false;

  var rd = fs.createReadStream(source);
  rd.on('error', function(err) {
    done(err);
  });
  var wr = fs.createWriteStream(target);
  wr.on('error', function(err) {
    done(err);
  });
  wr.on('close', function(ex) {
    done();
  });
  rd.pipe(wr);

  function done(err) {
    if (!cbCalled) {
      cb(err);
      cbCalled = true;
    }
  }
}

// main control flow
switch (args[0]) {
case undefined:
  printHelp();
  break;
case 'init':
  initJulia(function(err, res) {
    if (err) {
      console.log(chalk.red('ERR: Something went wrong...'));
      console.log(err);
    }
    else {
      console.log(chalk.green("init complete! run `gulp` to start watching files."));
    }
  });
  break;
case 'module':
  if (args[1]) {
    setupModule(args[1], function(err, res) {
      if (err) console.log(err);
    });
  }
  else {
    console.log('ERR: Provide module name.');
  }
  break;
}
