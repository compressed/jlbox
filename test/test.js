'use strict';
var should       = require('should');
var mkdirp       = require('mkdirp');
var cp           = require('child_process');
var path         = require('path');
var rimraf       = require('rimraf');
var outpath      = path.join(__dirname, '/project');
var jlboxPath    = path.join(__dirname, '../bin/jlbox.js');
var fs           = require('fs');
var events       = require('events');
var jlboxEmitter = new events.EventEmitter();
var child;
require('mocha');

describe('jlbox', function() {
  before(function(done) {
    mkdirp(outpath, done);
  });

  describe('jlbox commands', function() {
    it('should bootstrap project via init command', function(done) {
      this.timeout(60000);
      cp.exec(jlboxPath + ' init', {cwd: outpath}, function(err, stdout) {
        if (err) return done(err);
        console.log(stdout);
        fs.existsSync(path.join(outpath, 'test')).should.be.true;
        fs.existsSync(path.join(outpath, 'src')).should.be.true;
        fs.existsSync(path.join(outpath, 'gulpfile.js')).should.be.true;
        fs.existsSync(path.join(outpath, 'gulp.jl')).should.be.true;
        fs.existsSync(path.join(outpath, 'package.json')).should.be.true;
        fs.existsSync(path.join(outpath, 'node_modules')).should.be.true;
        fs.existsSync(path.join(outpath, 'test/helper.jl')).should.be.true;
        return done();
      });
    });

    it('should bootstrap module files via module command', function(done) {
      cp.exec(jlboxPath + ' module Sample', {cwd: outpath}, function(err) {
        if(err) return done(err);
        fs.existsSync(path.join(outpath, 'src/Sample.jl')).should.be.true;
        fs.existsSync(path.join(outpath, 'src/Sample.jl')).should.be.true;
        fs.existsSync(path.join(outpath, 'test/Sample_test.jl')).should.be.true;
        return done();
      });
    });
  });

  describe('jlbox watch', function() {
    before(function(done) {
      this.timeout(60000);
      child = cp.spawn('gulp', {cwd: outpath});
      var count = 0;
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', function(data) {
        data = data.trim();
        if (data) {
          console.log(data);
          if (data.match(/Waiting for changes/)) {
            // if it's the first time, then call done
            if (count === 0) {
              count += 1;
              done();
            }
            // otherwise emit an event that the test should list for
            else {
              jlboxEmitter.emit('jlbox:done', true);
            }
          }
        }
      });

      child.stderr.setEncoding('utf8');
      child.stderr.on('data', function(data) {
        console.log('err');
        console.log(data);
      });
    });

    var hook;
    beforeEach(function(){
      hook = captureStream(process.stdout);
    });

    afterEach(function(){
      hook.unhook();
    });

    // clean up child process and folder at the end
    after(function(done) {
      child.kill('SIGINT');
      return rimraf(outpath, done);
    });

    // NOTE: use different file names for each test, otherwise gulp/gaze will think they are the same event, given they happen so quickly, and ignore one.
    // alternatively, you can use setTimeout on each test of about 1000ms if you want to modify the same file twice
    it('should re-run test when module is changed', function(done) {
      this.timeout(60000);
      fs.writeFile(path.join(outpath, '/src/Sample.jl'), "module Sample\n\nend\n", function(err) {
        if (err) return done(err);
        return jlboxEmitter.once('jlbox:done', function() {
          should.exist(hook.captured().match(/2 facts verified/));
          return done();
        });
      });
    });

    it('should re-run test when test is changed', function(done) {
      this.timeout(60000);
      var content = 'module SampleTest\n' +
            'include("$(pwd())/test/helper.jl")\n' +
            'reload("$(pwd())/src/Sample.jl")\n' +
            'using Sample\n' +
            'facts("Sample") do\n' +
            '@fact 1 => 1\n' +
            'end\n' +
            'end # module SampleTest\n';
      fs.writeFile(path.join(outpath, '/test/Sample_test.jl'), content, function(err) {
        if (err) return done(err);
        return jlboxEmitter.once('jlbox:done', function() {
          should.exist(hook.captured().match(/1 fact verified/));
          return done();
        });
      });
    });

    it('should restart julia when there is a syntax error', function(done) {
      this.timeout(60000);
      var content = 'module SampleTest2\n' +
            'include("$(pwd())/test/helper.jl")\n' +
            'facts("Sample2") do\n' +
            '@fact 1 => 1:\n' +
            'end\n' +
            'end # module Sample2Test\n';
      fs.writeFile(path.join(outpath, '/test/Sample_test2.jl'), content, function(err) {
        if (err) return done(err);
        return jlboxEmitter.once('jlbox:done', function() {
          should.exist(hook.captured().match(/ZMQ bound/));
          return done();
        });
      });
    });

    // http://stackoverflow.com/questions/18543047/mocha-monitor-application-output
    function captureStream(stream){
      var oldWrite = stream.write;
      var buf = '';
      stream.write = function(chunk, encoding, callback){
        buf += chunk.toString(); // chunk is a String or Buffer
        oldWrite.apply(stream, arguments);
      };

      return {
        unhook: function unhook(){
          stream.write = oldWrite;
        },
        captured: function(){
          return buf;
        }
      };
    }
  });
});
