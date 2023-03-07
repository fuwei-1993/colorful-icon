module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt)
  const packageJSON = grunt.file.readJSON('package.json')

  grunt.initConfig({
    webfont: {
      syIcon: {
        src: './src/engine/build/glyphs/*.svg',
        dest: './src/engine/build/raw-font',
        options: {
          font: 'sy-icon-colorful',
          engine: 'fontforge',
          types: 'ttf',
          autoHint: false,
          execMaxBuffer: 1024 * 1000,
          version: packageJSON.version,
          codepointsFile: './src/engine/build/codepoints.js'
        }
      }
    }
  })

  grunt.loadNpmTasks('grunt-webfonts')
  grunt.registerTask('default', ['webfont'])
}
