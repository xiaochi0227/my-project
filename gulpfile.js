'use strict';

var gulp = require('gulp')
var $ = require('gulp-load-plugins')()
var openURL = require('open')
var lazypipe = require('lazypipe')
var rimraf = require('rimraf')
var wiredep = require('wiredep').stream
var runSequence = require('run-sequence')
var gutil = require('gulp-util')

var yeoman = {
  app: require('./bower.json').appPath || 'app',
  tmp: '.tmp',
  dist: 'dist'
}


var paths = {
  scripts: [yeoman.app + '/scripts/**/*.coffee'],
  jade: [yeoman.app + '/**/*.jade','!'+yeoman.app+'/base.jade'],
  styles: [yeoman.app + '/styles/**/common.less'],
  views: {
    main: [yeoman. tmp + '/**/*.html'],
    files: [yeoman.tmp + '/views/**/*.html']
  }
}

var lintScripts = lazypipe()
  .pipe($.coffeelint)
  .pipe($.coffeelint.reporter)

var styles = lazypipe()
  .pipe($.less,{
    outputstyle: 'expanded',
    precision: 10
  })
  .pipe($.autoprefixer,'last 1 version')
  .pipe(gulp.dest, yeoman.tmp + '/styles')


gulp.task('styles',function(){
  return gulp.src(paths.styles)
    .pipe(styles())
})

gulp.task('scripts',function(){
  return gulp.src(paths.scripts)
    .pipe(lintScripts())
    .pipe($.coffee({bare: true}).on('error',$.util.log))
    .pipe(gulp.dest(yeoman.tmp + '/scripts'))
})

gulp.task('jade',function(){
  return gulp.src(paths.jade)
    .pipe($.jade())
    .pipe($.prettify({indent_size: 2,unformatted: ['pre', 'code']}))
    .pipe(gulp.dest(yeoman.tmp))
})

gulp.task('watch',function(){

  $.watch(yeoman.app + '/styles/**/*').on('change',function(_path){
    console.log('styles change at: ',_path)
    runSequence(['styles'],function(){
      return gulp.src(yeoman.app + '/styles/**/*')
        .pipe($.connect.reload())
    })
  })

  $.watch(paths.scripts).on('change',function(_path){
    console.log('coffee change at: ',_path)
  }).pipe($.plumber())
    .pipe(lintScripts())
    .pipe($.coffee({bare: true}).on('error',$.util.log))
    .pipe(gulp.dest(yeoman.tmp + '/scripts'))
    .pipe($.connect.reload())

  $.watch(paths.jade)
    .on('change',function(_path){
      console.log('jade change at: ',_path)
    })
    .pipe($.plumber())
    .pipe($.jade())
    .pipe(gulp.dest(yeoman.tmp))
    .pipe($.connect.reload())
})

gulp.task('start:server',function(){
  $.connect.server({
    root: [yeoman.app ,yeoman.tmp],
    livereload: true,
    port: 2000
  })
})

gulp.task('start:client',['start:server','jade','styles','scripts'],function(){
  openURL('http://localhost:2000')
})

gulp.task('clean:tmp',function(cb){
  rimraf('./'+yeoman.tmp ,cb)
})

gulp.task('serve', function(cb){
  runSequence('clean:tmp',['start:client'],'watch',cb)
})

gulp.task('server',['serve'])

gulp.task('default',function(){
  console.log('Hello World!')
})