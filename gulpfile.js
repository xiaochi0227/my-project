
'use strict';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var openURL = require('open');
var lazypipe = require('lazypipe');
var rimraf = require('rimraf');
var wiredep = require('wiredep').stream;
var runSequence = require('run-sequence');
var gutil      = require('gulp-util');
var rev = require('gulp-rev'); //- 对文件名加MD5后缀
var revCollector = require('gulp-rev-collector'); //- 路径替换

var yeoman = {
  app: require('./bower.json').appPath || 'app',
  tmp: '.tmp',
  dist: 'dist'
};

var paths = {
  jade:[yeoman.app + '/**/*.jade','!'+yeoman.app+'/base.jade'],
  scripts: [yeoman.app + '/scripts/**/*.coffee'],
  styles: [yeoman.app + '/styles/common.less'],
  test: ['test/spec/**/*.coffee'],
  testRequire: [
    'test/mock/**/*.coffee',
    'test/spec/**/*.coffee'
  ],
  karma: 'karma.conf.js',
  views: {
    main: [yeoman.tmp + '/**/*.html','!'+yeoman.tmp + '/base.html'],
    files: [yeoman.tmp + '/views/**/*.html']
  }
};

////////////////////////
// Reusable pipelines //
////////////////////////

var lintScripts = lazypipe()
  .pipe($.coffeelint)
  .pipe($.coffeelint.reporter);

var styles = lazypipe()
  .pipe($.less, {
    outputStyle: 'expanded',
    precision: 10
  })
  .pipe($.autoprefixer, 'last 1 version')
  .pipe(gulp.dest, '.tmp/styles');

///////////
// Tasks //
///////////

//编译font-awesome样式
gulp.task('fontAwesome',function(){
  return gulp.src(yeoman.app + '/bower_components/font-awesome/less/font-awesome.less')
    .pipe($.sourcemaps.init())
    .pipe($.less())
    .pipe($.sourcemaps.write())
    .pipe($.rename('font-awesome.css'))
    .pipe(gulp.dest(yeoman.tmp + "/styles"))
});

gulp.task('copy:font-awesome', function () {
  return gulp.src([yeoman.app + '/bower_components/font-awesome/fonts/**/*'])
    .pipe(gulp.dest(yeoman.tmp + '/fonts'));
});

gulp.task('copy:font-bootstrap', function () {
  return gulp.src([yeoman.app + '/bower_components/bootstrap-css/fonts/**/*'])
    .pipe(gulp.dest(yeoman.tmp + '/fonts'));
});


//编译自己项目样式
gulp.task('styles',['fontAwesome'],function () {
  return gulp.src(paths.styles)
    .pipe(styles());
});

gulp.task('coffee', function() {
  return gulp.src(paths.scripts)
    .pipe(lintScripts())
    .pipe($.coffee({bare: true}).on('error', $.util.log))
    .pipe(gulp.dest('.tmp/scripts'));
});

gulp.task('jade', function() {
  gulp.src(paths.jade)
    .pipe($.jade())
    .pipe($.prettify({ indent_size: 2, unformatted: ['pre', 'code'] }))
    .pipe(gulp.dest(yeoman.tmp))
});

gulp.task('lint:scripts', function () {
  return gulp.src(paths.scripts)
    .pipe(lintScripts());
});

gulp.task('clean:tmp', function (cb) {
  rimraf('./' + yeoman.tmp, cb);
});

gulp.task('start:client', ['start:server', 'coffee','jade','styles'], function () {
  openURL('http://localhost:2000');
});

gulp.task('start:server', function() {
  $.connect.server({
    root: [yeoman.app, yeoman.tmp],
    livereload: true,
    // Change this to '0.0.0.0' to access the server from outside.
    port: 2000
  });
});

gulp.task('start:server:test', function() {
  $.connect.server({
    root: ['test', yeoman.app, yeoman.tmp],
    livereload: true,
    port: 2001
  });
});

gulp.task('watch', function () {
  //watch styles
  $.watch(yeoman.app + '/styles/**/*').on('change',function(_path){
    console.log("styles change at:",_path);
    runSequence(['styles'],function(){
      return gulp.src(yeoman.app + '/styles/**/*')
        .pipe($.connect.reload());
    });
  })

  //watch coffee
  $.watch(paths.scripts)
    .on('change',function(_path){
      console.log("coffee change at:",_path);
    })
    .pipe($.plumber())
    .pipe(lintScripts())
    .pipe($.coffee({bare: true}).on('error', $.util.log))
    .pipe(gulp.dest(yeoman.tmp + '/scripts'))
    .pipe($.connect.reload());

  //watch jade
  $.watch(paths.jade)
    .on('change',function(_path){
      console.log("jade change at:",_path);
    })
    .pipe($.plumber())
    .pipe($.jade())
    .pipe(gulp.dest(yeoman.tmp))
    .pipe($.connect.reload());

  $.watch(paths.test)
    .pipe($.plumber())
    .pipe(lintScripts());

  //watch Bower
  gulp.watch('bower.json', ['bower']);
});

gulp.task('serve', function (cb) {
  runSequence('clean:tmp',
    ['lint:scripts'],
    ['copy:font-awesome','copy:font-bootstrap'],
    ['start:client'],
    'watch', cb);
});

gulp.task('serve:prod', function() {
  $.connect.server({
    root: [yeoman.dist],
    livereload: true,
    port: 2000
  });
});

gulp.task('test', ['start:server:test'], function () {
  var testToFiles = paths.testRequire.concat(paths.scripts, paths.test);
  return gulp.src(testToFiles)
    .pipe($.karma({
      configFile: paths.karma,
      action: 'watch'
    }));
});

// inject bower components
gulp.task('bower', function () {
  return gulp.src([yeoman.app+"/*.jade"])
    .pipe(wiredep({
      directory: "./"+yeoman.app + '/bower_components',
      ignorePath: './app'
    }))
  .pipe(gulp.dest(yeoman.app));
});

///////////
// Build //
///////////

gulp.task('clean:dist', function (cb) {
  rimraf('./dist', cb);
});

//image min
gulp.task('images', function () {
  return gulp.src(yeoman.app + '/images/**/*')
    //.pipe($.imagemin({
    //  optimizationLevel: 5,
    //  progressive: true,
    //  interlaced: true
    //}))
    .pipe(gulp.dest(yeoman.dist + '/images'))
});

//copy fonts
gulp.task('copy:fonts', function () {
  return gulp.src([yeoman.app + '/fonts/**/*',yeoman.app + '/bower_components/bootstrap-css/fonts/**/*',yeoman.app + '/bower_components/simple-line-icons/fonts/**/*',yeoman.app + '/bower_components/font-awesome/fonts/**/*'])
    .pipe(gulp.dest(yeoman.dist + '/fonts'));
});

gulp.task('copy:static',function () {
  return gulp.src([
    yeoman.tmp + '/**/*.html',
    '!' + yeoman.tmp + '/*.html',
    yeoman.app + '/**/*.html',
    '!' + yeoman.app + '/bower_components/**/*.html',
    yeoman.app+'/**/*.mp4',
    yeoman.app + '/*.ico',
    yeoman.app + '/*.txt'
  ])
    .pipe(gulp.dest(yeoman.dist));
})

//copy html,js,css
gulp.task('html', ['jade','coffee','styles'] ,function (cb) {
  runSequence(['jade','coffee','styles'],['evn','copy:static'],cb)
});

gulp.task('rev',function(){
  var removeFiles = require('gulp-remove-files');
  var rename = require("gulp-rename");
  var revReplace = require('gulp-rev-replace');
  gulp.src([yeoman.dist + '/rev-manifest.json',yeoman.dist+'/**/*.html'])   //- 读取 rev-manifest.json 文件以及需要进行css名替换的文件
    .pipe(revCollector())//- 执行文件内js css名的替换
    .pipe(gulp.dest(yeoman.dist))//- 替换后的文件输出的目录
})

//js，css min
gulp.task('client:build', ['html'], function () {
  var jsFilter = $.filter('**/*.js');
  var cssFilter = $.filter('**/*.css');

  return gulp.src(paths.views.main)
    .pipe($.useref({searchPath: [yeoman.app, yeoman.tmp]}))
    .pipe(jsFilter)
    .pipe(rev())
    .pipe($.ngAnnotate())
    .pipe($.uglify({
      compress: {
        drop_console: true
      }
    }))
    .pipe(jsFilter.restore())
    .pipe(cssFilter)
    .pipe(rev())
    .pipe($.minifyCss({cache: true}))
    .pipe(cssFilter.restore())
    .pipe(gulp.dest(yeoman.dist))
    .pipe(rev.manifest())
    .pipe(gulp.dest(yeoman.dist)) //rev-manifest.json放入dist
    .on('end', function() {runSequence(['rev']) });
});

//config 环境替换
gulp.task('evn',function(){
  console.log("evn api:",gutil.env.api)
  if(gutil.env.api){
    gulp.src([
      '.tmp/scripts/config.js'
    ])
      .pipe($.replace(/apiUrl: '.*'/, "apiUrl: '" + gutil.env.api + "'"))
      .on('error', $.util.log)
      .pipe(gulp.dest('.tmp/scripts/'))
  }
})

//publish
gulp.task('build', ['clean:tmp','clean:dist'], function () {
  runSequence(['images','copy:fonts', 'client:build']);
});

gulp.task('server', ['serve']);
gulp.task('default', ['build']);
