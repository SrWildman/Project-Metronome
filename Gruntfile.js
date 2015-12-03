module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        src: 'src/<%= pkg.name %>.js',
        dest: 'build/<%= pkg.name %>.min.js'
      }
    },
    karma: {
      unit: {
        options: {
          frameworks: ['jasmine'],
          singleRun: false,
          browsers: ['PhantomJS'],
          files: [
            'http://ajax.googleapis.com/ajax/libs/angularjs/1.4.7/angular.js',
            'http://ajax.googleapis.com/ajax/libs/angularjs/1.4.7/angular-mocks.js',
            'src/js/**/*.js'
          ]
        }
      }
    },
    jasmine: {
      js: { 
        src: ['public/js/**/*.js', 'public/js/*.js'],
        vendor: '/node_modules/angular/angular.js/',
        options: {
          specs: 'src/js/*.test.js',
          template: require('grunt-template-jasmine-requirejs')
        }
      }
    },
    concat: {
      options: {},
      dist: {
        files: {
          'public/js/app.js': [
            'public/js/**/*.js',
            '!public/js/**/*.tests.js',
          ]
        }
      }
    },
    jshint: {
      files: ['Gruntfile.js', 'public/js/*.js', 'public/**/*.js', 'test/**/*.js'],
      options: {
        globals: {
          jQuery: true
        }
      }
    },
    watch: {
      files: ['<%= jshint.files %>'],
      tasks: ['jshint']
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');

  // Default task(s).
  grunt.registerTask('default', ['uglify']);

  // grunt-karma tasks!
  grunt.loadNpmTasks('grunt-karma');

  // grunt-concat tasks!
  grunt.loadNpmTasks('grunt-bower-concat');


  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');


  grunt.registerTask('test', [
    'karma'
  ]);

};
