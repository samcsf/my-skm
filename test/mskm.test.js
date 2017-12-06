const assert = require('assert')
const fs = require('fs')
const path = require('path')
const shell = require('shelljs')
const testConfig = {
  storePath: path.join(__dirname, 'tempStore'),
  sshPath: path.join(__dirname, 'tempSSH'),
  privateKeyName: 'id_rsa'
}
const {
  initProgram, 
  initStore, 
  createKeys, 
  showList, 
  switchKeys, 
  deleteKeys, 
  renameKeys
} = require('../src/actions')(testConfig)
const {cmpSymLink} = require('../src/utils')
const {hookConsole} = require('./testUtil')

let {storePath, sshPath, privateKeyName} = testConfig
let sshPriKeyPath = path.join(sshPath, privateKeyName)
let sshPubKeyPath = path.join(sshPath, privateKeyName + '.pub')

describe('My-Skm testing:', function(){

  beforeEach(function(){
    fs.mkdirSync(sshPath)
  })
  
  afterEach(function(){
    shell.rm('-rf', sshPath)
    shell.rm('-rf', storePath)
  })
  
  describe('#Init Command', function(){
    it('Store folder generated', function(){
      initStore()
      assert.equal(fs.existsSync(storePath), true)
    })
    
    it('Backup existing keys if any', function(){
      shell.exec('ssh-keygen -C test@test.com -q -N "" -f ' + path.join(sshPath, privateKeyName))
      assert.equal(fs.existsSync(sshPriKeyPath), true)
      assert.equal(fs.existsSync(sshPubKeyPath), true)
      assert.equal(fs.lstatSync(sshPriKeyPath).isSymbolicLink(), false)
      assert.equal(fs.lstatSync(sshPubKeyPath).isSymbolicLink(), false)
      initStore()
      assert.equal(fs.existsSync(sshPriKeyPath), true)
      assert.equal(fs.existsSync(sshPubKeyPath), true)
      assert.equal(fs.lstatSync(sshPriKeyPath).isSymbolicLink(), true)
      assert.equal(fs.lstatSync(sshPubKeyPath).isSymbolicLink(), true)
      let storePriKeyPath = path.join(storePath, 'default', privateKeyName)
      let storePubKeyPath = path.join(storePath, 'default', privateKeyName + '.pub')
      assert.equal(fs.existsSync(storePriKeyPath), true)
      assert.equal(fs.existsSync(storePubKeyPath), true)
      assert.equal(cmpSymLink(sshPriKeyPath, storePriKeyPath), true)
      assert.equal(cmpSymLink(sshPubKeyPath, storePubKeyPath), true)
    })
    
    it('Error msg when store already exists', function(){
      let expectedMsgs = [
        'Try to initialize the key store.',
        'mskm already initialized',
        'Please remove ' + storePath + ' if you need to re-initilize.'
      ]
      fs.mkdirSync(storePath)
      // capture console logs
      let msgs = []
      let defLogger = console.log
      console.log = hookConsole(defLogger, msgs)
      initStore()
      assert.deepStrictEqual(msgs, expectedMsgs)
      // restore console log
      console.log = defLogger
    })
  })
  
  describe('#Create command', function(){
    it('New folder with keys generated', function(){
      initStore()
      createKeys('test', '"-C test@test.com -N \'\' -q"')
      assert.equal(fs.existsSync(path.join(storePath, 'test')), true)
      assert.equal(fs.existsSync(path.join(storePath, 'test', privateKeyName)), true)
      assert.equal(fs.existsSync(path.join(storePath, 'test', privateKeyName + '.pub')), true)
    })
    
    it('Error message for duplicate case', function(){
      initStore()
      let expectedMsgs = [
        'This alias already exists, can not create duplicate names'
      ]
      fs.mkdirSync(path.join(storePath, 'test'))
      // capture console logs
      let msgs = []
      let defLogger = console.log
      console.log = hookConsole(defLogger, msgs)
      createKeys('test', '"-C test@test.com"')
      assert.deepStrictEqual(msgs, expectedMsgs)
      // restore console log
      console.log = defLogger
    })
  })

  describe('#Use command', function(){
    it('Keys in .SSH should symbol link to store', function(){
      initStore()
      createKeys('dev', '"-C dev@dev.com -N \'\' -q"')
      createKeys('test', '"-C test@test.com -N \'\' -q"')
      switchKeys('dev')
      let devPriPath = path.join(storePath, 'dev', privateKeyName)
      let devPubPath = path.join(storePath, 'dev', privateKeyName + '.pub')
      assert.equal(cmpSymLink(sshPriKeyPath, devPriPath), true)
      assert.equal(cmpSymLink(sshPubKeyPath, devPubPath), true)
      switchKeys('test')
      let testPriPath = path.join(storePath, 'test', privateKeyName)
      let testPubPath = path.join(storePath, 'test', privateKeyName + '.pub')
      assert.equal(cmpSymLink(sshPriKeyPath, testPriPath), true)
      assert.equal(cmpSymLink(sshPubKeyPath, testPubPath), true)
    })

    it('Error msg if alias not found', function(){
      let expectedMsgs = [
        'Invalid alias, NA not found'
      ]
      initStore()
      createKeys('dev', '"-C dev@dev.com -N \'\' -q"')
      createKeys('test', '"-C test@test.com -N \'\' -q"')
      // capture console logs
      let msgs = []
      let defLogger = console.log
      console.log = hookConsole(defLogger, msgs)
      switchKeys('NA')
      assert.deepStrictEqual(msgs, expectedMsgs)
      // restore console log
      console.log = defLogger
    })
  })

  describe('#List command', function(){
    it('Show the current use properly', function(){
      let expectedMsgs = [
        '    dev',
        ' -> prod',
        '    test'
      ]
      initStore()
      createKeys('dev', '"-C dev@dev.com -N \'\' -q"')
      createKeys('test', '"-C test@test.com -N \'\' -q"')
      createKeys('prod', '"-C prod@prod.com -N \'\' -q"')
      switchKeys('prod')
      // capture console logs
      let msgs = []
      let defLogger = console.log
      console.log = hookConsole(defLogger, msgs)
      showList()
      assert.deepStrictEqual(msgs, expectedMsgs)
      // restore console log
      console.log = defLogger
    })
  })

  describe('#Remove command', function(){
    it('Store folder got removed', function(){
      initStore()
      createKeys('test', '"-C test@test.com -N \'\' -q"')
      deleteKeys('test')
      assert.equal(fs.existsSync(path.join(storePath, 'test')), false)
    })

    it('Error msg when attemp to remove invalid keys', function(){
      initStore()
      createKeys('test', '"-C test@test.com -N \'\' -q"')
      switchKeys('test')
      let expectedMsgs = [
        'test keys are in using, please switch it first',
        'Invalid alias, no keys removed'
      ]
      // capture console logs
      let msgs = []
      let defLogger = console.log
      console.log = hookConsole(defLogger, msgs)
      deleteKeys('test')
      assert.deepStrictEqual(msgs, expectedMsgs.slice(0,1))
      deleteKeys('NA')
      assert.deepStrictEqual(msgs.slice(1), expectedMsgs.slice(1,2))
      // restore console log
      console.log = defLogger
    })
  })

  describe('#Rename command', function(){
    it('Store folder got renamed', function(){
      initStore()
      createKeys('test', '"-C test@test.com -N \'\' -q"')
      switchKeys('test')
      assert.equal(fs.existsSync(path.join(storePath, 'test')), true)
      assert.equal(fs.existsSync(path.join(storePath, 'dev')), false)
      renameKeys('test', 'dev')
      assert.equal(fs.existsSync(path.join(storePath, 'test')), false)
      assert.equal(fs.existsSync(path.join(storePath, 'dev')), true)
    })
  })

})