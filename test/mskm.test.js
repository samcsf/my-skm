const assert = require('assert')
const fs = require('fs')
const path = require('path')
const shell = require('shelljs')
const testConfig = {
  storePath: path.join(__dirname, 'tempStore'),
  sshPath: path.join(__dirname, 'tempSSH'),
  privateKeyName: 'id_rsa'
}
const { initProgram, initStore, createKeys, showList, switchKeys, deleteKeys, renameKeys, backupKeys, restoreKeys, sendKey } = require('../src/actions')(testConfig)
const { cmpSymLink } = require('../src/utils')
const { hookConsole } = require('./testUtil')

let { storePath, sshPath, privateKeyName } = testConfig
let publicKeyName = privateKeyName + '.pub'
let sshPriKeyPath = path.join(sshPath, privateKeyName)
let sshPubKeyPath = path.join(sshPath, publicKeyName)

describe('My-Skm testing:', function () {

  beforeEach(function () {
    fs.mkdirSync(sshPath)
  })

  afterEach(function () {
    shell.rm('-rf', sshPath)
    shell.rm('-rf', storePath)
  })

  describe('#Init Command', function () {
    it('Store folder generated', function () {
      initStore()
      assert.equal(fs.existsSync(storePath), true)
    })

    it('Backup existing keys if any', function () {
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
      let storePubKeyPath = path.join(storePath, 'default', publicKeyName)
      assert.equal(fs.existsSync(storePriKeyPath), true)
      assert.equal(fs.existsSync(storePubKeyPath), true)
      assert.equal(cmpSymLink(sshPriKeyPath, storePriKeyPath), true)
      assert.equal(cmpSymLink(sshPubKeyPath, storePubKeyPath), true)
    })

    it('Error msg when store already exists', function () {
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

  describe('#Create command', function () {
    it('New folder with keys generated', function () {
      initStore()
      createKeys('test', '"-C test@test.com -N \'\' -q"')
      assert.equal(fs.existsSync(path.join(storePath, 'test')), true)
      assert.equal(fs.existsSync(path.join(storePath, 'test', privateKeyName)), true)
      assert.equal(fs.existsSync(path.join(storePath, 'test', publicKeyName)), true)
    })

    it('Negative create case', function () {
      initStore()
      createKeys('test', '"-C test@test.com -N \'\' -q -#"') // command will fail
      assert.equal(fs.existsSync(path.join(storePath, 'test', privateKeyName)), false)
      assert.equal(fs.existsSync(path.join(storePath, 'test', publicKeyName)), false)
    })

    it('Error message for duplicate case', function () {
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

    it('Create mode will parse the other options to string', function () {
      let expectedArgv = ['node', 'fileName', 'create', 'alias', '"-C test@test.com -f xxx"']
      let backupArgv = process.argv
      process.argv = ['node', 'fileName', 'create', 'alias', '-C', 'test@test.com', '-f', 'xxx']
      initProgram()
      let result = process.argv.map(t => t)
      assert.deepStrictEqual(result, expectedArgv)
      // should be same for short-form c, 'create' -> 'c'
      expectedArgv[2] = 'c'
      process.argv = ['node', 'fileName', 'c', 'alias', '-C', 'test@test.com', '-f', 'xxx']
      initProgram()
      result = process.argv.map(t => t)
      assert.deepStrictEqual(result, expectedArgv)
      process.argv = backupArgv
    })

  })

  describe('#Use command', function () {
    it('Keys in .SSH should symbol link to store', function () {
      initStore()
      createKeys('dev', '"-C dev@dev.com -N \'\' -q"')
      createKeys('test', '"-C test@test.com -N \'\' -q"')
      switchKeys('dev')
      let devPriPath = path.join(storePath, 'dev', privateKeyName)
      let devPubPath = path.join(storePath, 'dev', publicKeyName)
      assert.equal(cmpSymLink(sshPriKeyPath, devPriPath), true)
      assert.equal(cmpSymLink(sshPubKeyPath, devPubPath), true)
      switchKeys('test')
      let testPriPath = path.join(storePath, 'test', privateKeyName)
      let testPubPath = path.join(storePath, 'test', publicKeyName)
      assert.equal(cmpSymLink(sshPriKeyPath, testPriPath), true)
      assert.equal(cmpSymLink(sshPubKeyPath, testPubPath), true)
    })

    it('Error msg if alias not found', function () {
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

    it('Error msg if already using', function () {
      let expectedMsgs = [
        'Already using test',
        ' -> test'
      ]
      initStore()
      createKeys('test', '"-C test@test.com -N \'\' -q"')
      switchKeys('test')
      // capture console logs
      let msgs = []
      let defLogger = console.log
      console.log = hookConsole(defLogger, msgs)
      switchKeys('test')
      assert.deepStrictEqual(msgs, expectedMsgs)
      // restore console log
      console.log = defLogger
    })
  })

  describe('#List command', function () {
    it('Show the current use properly', function () {
      let expectedMsgs = [
        '    dev',
        ' -> prod',
        '    test'
      ]
      initStore()
      // should only show folders but not files
      shell.touch(path.join(storePath, 'dummy'))
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

  describe('#Remove command', function () {
    it('Store folder got removed', function () {
      initStore()
      createKeys('test', '"-C test@test.com -N \'\' -q"')
      deleteKeys('test')
      assert.equal(fs.existsSync(path.join(storePath, 'test')), false)
    })

    it('Error msg when attemp to remove invalid keys', function () {
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
      assert.deepStrictEqual(msgs, expectedMsgs.slice(0, 1))
      deleteKeys('NA')
      assert.deepStrictEqual(msgs.slice(1), expectedMsgs.slice(1, 2))
      // restore console log
      console.log = defLogger
    })
  })

  describe('#Rename command', function () {
    it('Store folder got renamed', function () {
      initStore()
      createKeys('test', '"-C test@test.com -N \'\' -q"')
      switchKeys('test')
      assert.equal(fs.existsSync(path.join(storePath, 'test')), true)
      assert.equal(fs.existsSync(path.join(storePath, 'dev')), false)
      renameKeys('test', 'dev')
      assert.equal(fs.existsSync(path.join(storePath, 'test')), false)
      assert.equal(fs.existsSync(path.join(storePath, 'dev')), true)
    })

    it('Error msg if alias not found', function () {
      let expectedMsgs = [
        'Alias test not exists'
      ]
      initStore()
      // capture console logs
      let msgs = []
      let defLogger = console.log
      console.log = hookConsole(defLogger, msgs)
      renameKeys('test', 'test2')
      assert.deepStrictEqual(msgs, expectedMsgs)
      // restore console log
      console.log = defLogger
    })

    it('Error msg if new alias already exists', function () {
      let expectedMsgs = [
        'Alias dev already exists, rename failed'
      ]
      initStore()
      createKeys('dev', '"-C dev@dev.com -N \'\' -q"')
      createKeys('test', '"-C test@test.com -N \'\' -q"')
      // capture console logs
      let msgs = []
      let defLogger = console.log
      console.log = hookConsole(defLogger, msgs)
      renameKeys('test', 'dev')
      assert.deepStrictEqual(msgs, expectedMsgs)
      // restore console log
      console.log = defLogger
    })
  })

  describe('#Backup command', function () {
    it('Should generate backup file', function () {
      let backupPath = path.join(__dirname, 'backup_temp.tar')
      initStore()
      createKeys('dev', '"-C dev@dev.com -N \'\' -q"')
      createKeys('test', '"-C test@test.com -N \'\' -q"')
      createKeys('prod', '"-C prod@prod.com -N \'\' -q"')
      backupKeys(backupPath)
      assert.equal(fs.existsSync(backupPath), true)
      assert.equal(fs.statSync(backupPath).size > 0, true)
    })
  })

  describe('#Restore command', function () {
    it('Backup file will extract to store', function () {
      let backupPath = path.join(__dirname, 'backup_temp.tar')
      initStore()
      restoreKeys(backupPath)
      assert.equal(fs.existsSync(storePath, 'dev'), true)
      assert.equal(fs.existsSync(storePath, 'dev', privateKeyName), true)
      assert.equal(fs.existsSync(storePath, 'dev', publicKeyName), true)
      assert.equal(fs.existsSync(storePath, 'test'), true)
      assert.equal(fs.existsSync(storePath, 'test', privateKeyName), true)
      assert.equal(fs.existsSync(storePath, 'test', publicKeyName), true)
      assert.equal(fs.existsSync(storePath, 'prod'), true)
      assert.equal(fs.existsSync(storePath, 'prod', privateKeyName), true)
      assert.equal(fs.existsSync(storePath, 'prod', publicKeyName), true)
      fs.unlinkSync(backupPath)
    })
  })

  describe('#Send command', function () {
    it('Will send id differ to given argv', function () {
      const host = '121.122.123.124'
      const alias = 'test'
      let expectedCmd = [
        'ssh-copy-id -i ' + sshPubKeyPath + ' ' + host,
        'ssh-copy-id -i ' + path.join(storePath, alias, publicKeyName) + ' ' + host
      ]
      let exec = shell.exec
      let cmdString = ''
      // mock shell.exec() to capture command string
      shell.exec = cmd=>{cmdString = cmd; return {code:0}}
      sendKey(host)
      assert.deepStrictEqual(cmdString, expectedCmd[0])
      sendKey(host, alias)
      assert.deepStrictEqual(cmdString, expectedCmd[1])
      // restore mocking
      shell.exec = exec
    })
  })

})