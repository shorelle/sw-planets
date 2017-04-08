// gulpfile.js

'use strict';

const $            = require('gulp-load-plugins')();
const gulp         = require('gulp');

const argv         = require('yargs').argv;
const autoprefixer = require('autoprefixer');
const babelify     = require('babelify');
const browserify   = require('browserify');
const browserSync  = require('browser-sync').create();
const buffer       = require('vinyl-buffer');
const source       = require('vinyl-source-stream');
const runSequence  = require('run-sequence');
const watchify     = require('watchify');

// File paths
const paths = {
  src: 'src',
  dist: 'dist',
  static: '/**/*.{html,svg,json,ico}'
};

/*
 * Deletes processed files.
 */
gulp.task('clean', () => {
  return gulp.src([paths.dist + '/**', '!dist/.git/**'])
    .pipe($.plumber())
    .pipe($.clean());
});

/*
 * Copy static files
 */
gulp.task('copy', () => {
  return gulp.src(paths.src + paths.static)
    .pipe($.plumber())
    .pipe(gulp.dest(paths.dist))
    .pipe(browserSync.stream());
});

/*
 * Lint source files.
 */
gulp.task('lint', function() {
  return gulp.src(paths.src + '/js/**/*.js')
              .pipe($.plumber())
              .pipe($.eslint())
              .pipe($.eslint.format())
              .pipe($.eslint.failAfterError());
});

/*
 * Uses Sass compiler to process styles, adds vendor prefixes, minifies, then
 * outputs file to the appropriate location.
 */
gulp.task('sass', () => {
  let glob = gulp.src(paths.src + '/scss/main.scss')
    .pipe($.plumber())
    .pipe($.sassGlob());

  return glob.pipe($.if(!argv.prod, $.sourcemaps.init()))
    .pipe($.sass({ 
      outputStyle: 'compressed',
      sourcemap: !argv.prod
    }))
    .on('error', $.sass.logError)
    .on('error', (err) => {
      $.notify().write(err);
    })
    .pipe($.combineMq({
        beautify: false
    }))
    .pipe($.postcss([ autoprefixer({ browsers: ['last 2 versions'] }) ]))
    .pipe($.if(!argv.prod, $.sourcemaps.write('./')))
    .pipe(gulp.dest(paths.dist + '/css'))
    .pipe(browserSync.stream());
});

/*
 * Transpiles and uglifies JS files and outputs result to the
 * appropriate location.
  */
gulp.task('js', () => {
  const filename = 'main';

  const props = {
    entries: [paths.src + '/js/' + filename +'.js'],
    debug : true,
    cache: {},
    packageCache: {}
  };

  const bundler = argv.prod ? browserify(props) : watchify(browserify(props));

  function rebundle() {
    let stream = bundler.transform('babelify')
      .bundle();
    return stream
      .pipe($.plumber())
      .on('error', (err) => { 
        $.notify().write(err);
      })
      .pipe(source(filename + '.js'))
      .pipe($.if(argv.prod, buffer()))
      .pipe($.if(argv.prod, $.uglify()))
      .pipe(gulp.dest(paths.dist + '/js'));
  }

  bundler.on('update', function() {
    rebundle();
    $.util.log('Rebundle...');
    browserSync.reload();
  });

  return rebundle();

});

/*
 * Optimizes and copies image files.
 */
gulp.task('images', () => {
  return gulp.src(paths.src + '/img/**/*')
    .pipe($.plumber())
    .pipe($.imagemin())
    .pipe(gulp.dest(paths.dist + '/img'))
    .pipe(browserSync.stream());
});

/*
 * Builds site
 */
gulp.task('build', (done) => {
  runSequence('clean',
              ['copy', 'images', 'sass', 'js'],
              done);
});

/*
 * Default task: build site, and watch for future changes.
 */
gulp.task('default', ['build'], () => {
  if (argv.prod) return;

  browserSync.init({
    server: {
      baseDir: paths.dist,
    },
    ghostMode: false,
    open: true
  });

  // Watch
  gulp.watch(paths.src + '/img/**/*', ['images']);
  gulp.watch(paths.src + '/scss/**/*.scss', ['sass']);
  gulp.watch(paths.src + '/js/**/*.js', ['lint']);
  gulp.watch(paths.src + paths.static, ['copy']);

});
