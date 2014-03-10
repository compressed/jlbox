# jlbox

[![Build Status](https://travis-ci.org/compressed/jlbox.png)](https://travis-ci.org/compressed/jlbox)

jlbox uses node.js to provide a mechanism for automatically reloading julia source and test files via gulp.js and a ZMQ socket. The tests are assumed to be using the [FactCheck.jl](https://github.com/zachallaun/FactCheck.jl) package. jlbox will even restart your julia process if you manage to write code that crashes it!

jlbox will also stub out module/test file pairs.

# Dependencies

Install node and ZMQ. On OS X, I use [homebrew](http://brew.sh/):

```shell
brew install node
brew install zmq
```

In julia, ensure you have FactCheck.jl and ZMQ.jl packages installed:

```julia
Pkg.add("ZMQ")
Pkg.add("FactCheck")
```

# Install

Use npm to install:

```shell
npm install -g jlbox
```

The `-g` flag will make the `jlbox` binary available from your command line.

# Workflow

```shell
mkdir my_project
cd my_project
jlbox init
jlbox module Sample
gulp
```

With your project ready to go, run the `gulp` command in your project root. This command will start watching files in in `src/` and `test/` directories. When a source file is modified, it will look in the `test/` folder for corresponding file `filename_test.jl`. When a test file is modified, it will re-run the tests in that file.

In order to avoid redefinition problems, use modules for your code and tests. Please see [jlbox.jl](src/templates/jlbox.jl) and [jlbox_test.jl](src/templates/jlbox_test.jl) for examples.

For more information, please see my [blog post](http://techstrings.com/2014/02/28/realtime-testing-with-julia-gulpjs-zmq/).

# Commands

## init

Running `jlbox init` will setup your project for watching julia files. It should be run in your project root. It does a few things:

- Makes `test/` and `src/`' folders
- Creates a `gulpfile.js` and `gulp.jl` file
- Creates a `package.json` file
- Uses npm to install: gulp, gulp-util, and zmq node packages

## module

Running `jlbox module Simple` will make two files `src/Simple.jl` and `test/Simple_test.jl`. The files will be stubbed out and include the basics for

# Contributing

I'm very open to contributions. This tool has helped me improve my workflow and I'm sure there are plenty of features (e.g. custom templates, etc.) that will make it much better. Feel free to submit a PR/issue with your ideas.
