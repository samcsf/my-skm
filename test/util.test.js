const assert = require('assert')
const fs = require('fs')
const path = require('path')
const shell = require('shelljs')
const tempPath = path.join(__dirname, 'temp')
const {cmpSymLink, execCMD} = require('../src/utils')

describe('Util testing:', function(){
  beforeEach(function(){
    fs.mkdirSync(tempPath)
  })

  afterEach(function(){
    shell.rm('-rf', tempPath)
  })

  describe('cmpSymLink()', function(){
    it('Returns correct result', function(){
      let dummyPath = path.join(tempPath, 'dummy.test')
      let originPath = path.join(tempPath, 'origin.test')
      let linkPath = path.join(tempPath, 'link.test')
      shell.touch(dummyPath)
      shell.touch(originPath)
      fs.symlinkSync(originPath, linkPath)
      assert.equal(cmpSymLink(linkPath, originPath), true)
      // only return true when there's link between
      assert.equal(cmpSymLink(linkPath, dummyPath), false)
      // 1st parameter should be link
      assert.equal(cmpSymLink(dummyPath, originPath), false)
    })
  })

  describe('execCMD()', function(){
    it('Throw err when command fail', function(){
      let isErr = false
      execCMD(
        shell.cat('throw-an-error'),
        () => console.log('Impossible.'),
        () => isErr = true
      )
      assert.equal(isErr, true)
    })
  })
})