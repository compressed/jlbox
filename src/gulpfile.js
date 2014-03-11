'use strict';
var gulp      = require('gulp');
var gutil     = require('gulp-util');
var zmq       = require('zmq');
var spawn     = require('child_process').spawn;
var fs        = require('fs');
var file_path;
var sock;
var child;

// watch all jl files in tests and scripts dirs
var paths     = {
  tests: 'test/**/*.jl',
  scripts: 'src/**/*.jl'
};

var setupJuliaProcess = function() {
  sock            = zmq.socket('req');
  child           = spawn("julia", ["--color", "gulp.jl"], {cwd: process.cwd()});
  var ZMQStartReg = /ZMQ bound to endpoint: (.+)/;

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', function(data) {
    data = data.trim();

    if (data) {
      // if restarting julia, re-connect the socket
      var match = ZMQStartReg.exec(data);
      if (match) {
        sock.connect(match[1]);
        gutil.log(gutil.colors.green(data));
      }
      else {
        console.log(data);
      }
    }
  });

  child.stderr.setEncoding('utf8');
  child.stderr.on('data', function(data) {
    console.log(data.trim());
  });

  child.on('close', function(code) {
    gutil.log(gutil.colors.red("Julia exited, with exit code: ", code));
    gutil.log(gutil.colors.green("Restarting julia..."));
    setupJuliaProcess();
  });
};

// build child process
setupJuliaProcess();

gulp.task('juliaZMQ', function(){
  // if file name exists, send it across
  if (fs.existsSync(file_path)) {
    gutil.log("Sending " + file_path + " to julia");
    sock.send(file_path);
  }
});

var watcher = gulp.watch([paths.tests, paths.scripts], ['juliaZMQ']);
// regex to match any jl files in src dir
var re      = /(.*\/)src\/(.+)\.jl/;

watcher.on('change', function(event){
  if (event.type !== 'deleted') {
    gutil.log(event.path + ' ' + event.type);
    var match = re.exec(event.path);

    // if no match, test file has been edited
    if (match === null) {
      file_path = event.path;
    }
    // src file has been edited, find the corresponding test file
    else {
      file_path = match[1]+'test/'+match[2]+'_test.jl';
    }
  }
  else {
    file_path = "";
  }
});

// ensure julia process is closed at termination
process.on('SIGINT', function() {
  if (child) child.kill('SIGINT');
  process.exit();
});

gulp.task('default', ['juliaZMQ']);
