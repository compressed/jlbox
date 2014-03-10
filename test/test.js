'use strict';
var should    = require('should');
var mkdirp    = require('mkdirp');
var cp        = require('child_process');
var path      = require('path');
var rimraf    = require('rimraf');
var ps        = require('ps-node');
var outpath   = path.join(__dirname, '/project');
var jlboxPath = path.join(__dirname, '../bin/jlbox.js');
var fs        = require('fs');
require('mocha');

describe('jlbox', function() {
  before(function(done) {
    mkdirp(outpath, done);
  });

  describe('jlbox commands', function() {
    it('should bootstrap project via init command', function(done) {
      this.timeout(60000);
      cp.exec(jlboxPath + ' init', {cwd: outpath}, function(err) {
        if (err) return done(err);
        console.log(outpath);
        should.exist(path.join(outpath, 'test'));
        should.exist(path.join(outpath, 'src'));
        should.exist(path.join(outpath, 'gulpfile.js'));
        should.exist(path.join(outpath, 'gulp.jl'));
        should.exist(path.join(outpath, 'package.json'));
        should.exist(path.join(outpath, 'node_modules'));
        should.exist(path.join(outpath, 'test/helper.jl'));
        return done();
      });
    });

    it('should bootstrap module files via module command', function(done) {
      cp.exec(jlboxPath + ' module Sample', {cwd: outpath}, function(err) {
        if(err) return done(err);
        should(fs.existsSync(path.join(outpath, 'src/Sample.jl'))).be.true;
        should.exist(path.join(outpath, 'src/Sample.jl'));
        should.exist(path.join(outpath, 'test/Sample_test.jl'));
        return done();
      });
    });
  });
  var child;
  describe('jlbox watch', function() {
    before(function(done) {
      this.timeout(15000);
      child = cp.spawn('gulp', {cwd: outpath});
      var count = 0;
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', function(data) {
        data = data.trim();
        if (data) {
          console.log(data);
          if (data.match(/.*Waiting for changes...*/) && count === 0) {
            count += 1;
            done();
          }
        }
      });
    });

    var hook;
    beforeEach(function(){
      hook = captureStream(process.stdout);
    });

    afterEach(function(){
      hook.unhook();
    });

    it('should re-run test when module is changed', function(done) {
      fs.writeFile(path.join(outpath, '/src/Sample.jl'), "module Sample\n\nend\n", function(err) {
        if (err) return done(err);
        return setTimeout(function() {
          should.exist(hook.captured().match(/0 facts verified/));
          return done();
        }, 1000);
      });
    });

    it('should re-run test when test is changed', function(done) {
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
        return setTimeout(function() {
          should.exist(hook.captured().match(/1 fact verified/));
          return done();
        }, 1000);
      });
    });

    it('should restart julia when there is a syntax error', function(done) {
      this.timeout(10000);
      var content = 'module SampleTest\n' +
            'include("$(pwd())/test/helper.jl")\n' +
            'reload("$(pwd())/src/Sample.jl")\n' +
            'using Sample\n' +
            'facts("Sample") do\n' +
            '@fact 1 => 1:\n' +
            'end\n' +
            'end # module SampleTest\n';
      fs.writeFile(path.join(outpath, '/test/Sample_test.jl'), content, function(err) {
        if (err) return done(err);

        return setTimeout(function() {
          should.exist(hook.captured().match(/ZMQ bound/));
          return done();
        }, 8000);
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

  after(function(done) {
    child.kill('SIGINT');
    // kill julia process
    ps.lookup({command: 'julia', arguments: [ '--color', 'gulp.jl' ]}, function(err,res) {
      if (err) return done(err);
      // if julia process remains... kill it
      if (res && res[0]) {
        process.kill(res[0].pid, 'SIGINT');
      }
      // clean-up project dir
      return rimraf(outpath, done);
    });
  });
});
