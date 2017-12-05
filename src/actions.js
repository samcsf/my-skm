const shell = require('shelljs')
const fs = require('fs')
const path = require('path')
const {cmpSymLink, execCMD} = require('./utils')

function generator(config){
  const {
    storePath,
    sshPath,
    privateKeyName,
  } = config

  function checkAliasExist(alias) {
    return fs.existsSync(path.join(storePath, alias))
  }
  
  function checkAliasInUse(alias) {
    if(!checkAliasExist(alias))
      return false
    return cmpSymLink(path.join(sshPath, privateKeyName), path.join(storePath, alias, privateKeyName))
  }

  function reLinkSSH(alias){
    fs.unlinkSync(path.join(sshPath, privateKeyName))
    fs.unlinkSync(path.join(sshPath, privateKeyName + '.pub'))
    fs.symlinkSync(path.join(storePath, alias, privateKeyName), path.join(sshPath, privateKeyName))
    fs.symlinkSync(path.join(storePath, alias, privateKeyName + '.pub'), path.join(sshPath, privateKeyName + '.pub'))
  }

  function showList(){
    // output 
    for(let d of fs.readdirSync(storePath)){
      // skip non-directory
      if (!fs.statSync(path.join(storePath, d)).isDirectory()) {
        continue 
      }
      let arrow = ' ->'
      let space = '   '
      let isInUse = cmpSymLink(path.join(sshPath, privateKeyName), path.join(storePath, d, privateKeyName))
      console.log(`${isInUse ? arrow : space} ${d}`)
    }
  }

  return {
    initProgram: function initProgram(){
      // override create mode's parameters to avoid 'unknown option error'
      let argv = process.argv
      if (argv[2] === 'create' || argv[2] === 'c') {
        let bypassOpts = '"' + argv.slice(4).join(' ') + '"'
        argv = argv.slice(0, 4).concat([bypassOpts])
        process.argv = argv
      }
    },
    
    showList,
    
    initStore: function initStore() {
      console.log('Try to initialize the key store.')
      // check store existense
      try{
        fs.mkdirSync(storePath)
      }catch(err){
        if (err.code === 'EEXIST'){
          console.log('mskm already initialized')
          console.log('Please remove ' + storePath + ' if you need to re-initilize.')
          return 
        }
      }
      // check keys in default location, if exists backup to alias default
      let backups = []
      let items = fs.readdirSync(sshPath)
      for(let i of items){
        if (i === privateKeyName || i === (privateKeyName + '.pub')) {
          backups.push(i)
        }
      }
      if (backups.length > 0) {
        fs.mkdirSync(path.join(storePath, 'default'))
        backups.forEach(f =>{
          fs.copyFileSync(path.join(sshPath, f), path.join(storePath, 'default', f))
          fs.unlinkSync(path.join(sshPath, f))
          fs.symlinkSync(path.join(storePath, 'default', f), path.join(sshPath, f))
        })
      }
      console.log('Initialization completed. mskm is ready.')
    },
    
    switchKeys: function switchKeys(alias){
      // check alias
      if(!fs.existsSync(path.join(storePath, alias)))
        return false
      if (cmpSymLink(path.join(sshPath, privateKeyName), path.join(storePath, alias))) {
        console.log('Already using ' + alias)
        showList()
        return false
      }
      // re link the keys
      try{
        reLinkSSH(alias)
      } catch(err) {
        console.log(err)
      }
      console.log('Keys of ' + alias + ' already linked to user store')
      console.log('Now using ' + alias)
      showList()
      return true
    },
    
    createKeys: function createKeys(alias, options) {
      // exit when creating duplicate alias
      if (checkAliasExist(alias)) {
        console.log('This alias already exists, can not create duplicate names')
        return
      }
      options = JSON.parse(options) // To remove quote mark "" 
      console.log('Try to create new key with alias ' + alias + ' and options ' + options)
      // create sub-directory
      let aliasPath = path.join(storePath, alias)
      fs.mkdirSync(aliasPath)
      // generate keys with ssh-keygen
      execCMD(
        shell.exec('ssh-keygen ' + options + ' -f ' + path.join(aliasPath, privateKeyName)),
        () => console.log('Key created with alias: ' + alias),
        () => console.log('Key created fail.')
      )
    },
    
    deleteKeys: function deleteKeys(alias) {
      if (!checkAliasExist(alias)) {
        console.log('Invalid alias, no keys removed')
        return 
      }
      if (checkAliasInUse(alias)) {
        console.log(alias + ' keys are in using, please switch it first')
        return
      }
      console.log('Remove ' + alias)
      execCMD(
        shell.rm('-rf', path.join(storePath, alias)),
        () => console.log('Remove done.'),
        () => console.log('Remove failed.')
      )
    },
    
    renameKeys: function renameKeys(alias, newAlias) {
      if (!checkAliasExist(alias)) {
        console.log('Alias ' + alias + ' not exists')
        return 
      }
      if (checkAliasExist(newAlias)) {
        console.log('Alias ' + newAlias + ' already exists, rename failed')
        return 
      }
      console.log('Rename ' + alias + ' to ' + newAlias)
      let isInUse = checkAliasInUse(alias)
      execCMD(
        shell.mv(path.join(storePath, alias), path.join(storePath, newAlias)),
        () => {
          if (isInUse){
            reLinkSSH(newAlias)
          }
          console.log(alias + ' successfully renamed to ' + newAlias)
        },
        () => console.log('Rename failed.')
      )
    }
  }
}

module.exports = generator
