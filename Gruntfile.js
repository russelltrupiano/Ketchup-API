module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		concurrent: {
			dev: {
				tasks: ['nodemon', 'node-inspector', 'watch'],
				options: {
					logConcurrentOutput: true
				}
			}
		},
		nodemon: {
			dev: {
				script: 'app.js',
				options: {
					nodeArgs: ['--debug'],
					env: {
						PORT: '5455'
					},
					// omit this property if you aren't serving HTML files and
					// don't want to open a browser tab on start
					callback: function (nodemon) {
						nodemon.on('log', function (event) {
							console.log(event.colour);
						});

						// opens browser on initial server start
						nodemon.on('config:update', function () {
							// Delay before server listens on port
							setTimeout(function() {
							require('open')('http://localhost:5455');
							}, 1000);
						});

						// refreshes browser when server reboots
						nodemon.on('restart', function () {
							// Delay before server listens on port
							setTimeout(function() {
							require('fs').writeFileSync('.rebooted', 'rebooted');
							}, 1000);
						});
					}
				}
			}
		},
		stylus: {
			compile: {
				options: {
					paths: ['public/stylesheets/'],
					urlfunc: 'embedurl', // use embedurl('test.png') in our code to trigger Data URI embedding
					use: [
						require('rupture'), // use stylus plugin at compile time
						require('jeet'), // use stylus plugin at compile time
						require('axis'), // use stylus plugin at compile time
						require('nib'), // use stylus plugin at compile time
						require('autoprefixer-stylus'), // use stylus plugin at compile time
					],
				},
				files: {
					'public/css/style.css': 'public/stylesheets/style.styl', // 1:1 compile
				}
			},
		},
		cssmin: {
            css: {
                options: {
                    keepSpecialComments: 0,
                },
                files: {
                    'public/css/index.min.css': [
                        'public/css/style.css',
                    ],
                }
            }
        },
        uglify: {
            js: {
                options: {
                    sourceMap: true,
                    mangle: false
                },
                files: {
                    'public/javascripts/index-lib.min.js' : [
                        'public/lib/jquery-2.1.1.min.js',
                    ]
                    // ,
                    // 'public/javascripts/index-post.min.js' : [
                    //     'public/javascripts/main.js',
                    // ]
                }
            }
        },
		watch: {

			stylusFile: {
				files: 'public/stylesheets/style.styl',
				tasks: [ 'default' ],
				options: {
					livereload: true
				}
			},
			server: {
				files: ['.rebooted'],
				options: {
					livereload: true
				}
			},
			cssJadeJsFiles: {
				files: [
					'public/css/*.css',
					'views/*.jade',
					'public/javascripts/*.js'
				],
				options: {
					livereload: true
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-livereload');
	grunt.loadNpmTasks('grunt-concurrent');
	grunt.loadNpmTasks('grunt-nodemon');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-stylus');
	grunt.registerTask('default', [ 'stylus', 'cssmin']);
	grunt.registerTask('compile', [ 'stylus', 'cssmin', 'uglify']);

	grunt.event.on('watch', function(action, filepath) {
		grunt.config('stylus.compile.files', filepath);
	});
};
