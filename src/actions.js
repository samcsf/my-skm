const shell = require('shelljs')
const os = require('os')
const fs = require('fs')
const path = require('path')
const {cmpSymLink, execCMD} = require('./utils')

function generator(config){
  const {
    storePath,
    sshPath,
    privateKeyName,
  } = config

  const priKeyPath = path.join(sshPath, privateKeyName)
  const pubKeyPath = path.join(sshPath, privateKeyName + '.pub')

  function checkAliasExist(alias) {
    return fs.existsSync(path.join(storePath, alias))
  }
  
  function checkAliasInUse(alias) {
    if(!checkAliasExist(alias))
      return false
    return cmpSymLink(priKeyPath, path.join(storePath, alias, privateKeyName))
  }

  function reLinkSSH(alias){
    try{
      fs.unlinkSync(priKeyPath)
    }catch(err){
      console.log('reLinkSSH()' + err.code)
    }
    try{
      fs.unlinkSync(pubKeyPath)
    }catch(err){
      console.log('reLinkSSH()' + err.code)
    }
    fs.symlinkSync(path.join(storePath, alias, privateKeyName), priKeyPath)
    fs.symlinkSync(path.join(storePath, alias, privateKeyName + '.pub'), pubKeyPath)
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
      let isInUse = cmpSymLink(priKeyPath, path.join(storePath, d, privateKeyName))
      console.log(`${isInUse ? arrow : space} ${d}`)
    }
  }

  return {
    initProgram: function (){
      // override create mode's parameters to avoid 'unknown option error'
      let argv = process.argv
      if (argv[2] === 'create' || argv[2] === 'c') {
        let bypassOpts = '"' + argv.slice(4).join(' ') + '"'
        argv = argv.slice(0, 4).concat([bypassOpts])
        process.argv = argv
      }
    },
    
    showList,
    
    initStore: function () {
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
    
    switchKeys: function (alias){
      // check alias
      if(!fs.existsSync(path.join(storePath, alias))){
        console.log('Invalid alias, ' + alias + ' not found')
        return false
      }
      if (cmpSymLink(priKeyPath, path.join(storePath, alias))) {
        console.log('Already using ' + alias)
        showList()
        return false
      }
      // re link the keys
      try{
        reLinkSSH(alias)
      } catch(err) {
        console.log('switchLink() error' + err)
      }
      console.log('Keys of ' + alias + ' already linked to user store')
      console.log('Now using ' + alias)
      showList()
      return true
    },
    
    createKeys: function (alias, options) {
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
        () => console.log('Key created fail. * Create function bases on "ssh-keygen" cli')
      )
    },
    
    deleteKeys: function (alias) {
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
    
    renameKeys: function (alias, newAlias) {
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
    },

    backupKeys: function (target){
      // archive with tar command
      execCMD(
        shell.exec(`tar -czvf ${target} -C ${storePath} .`),
        () => console.log('Store achived to ' + path.resolve(target)),
        () => console.log('Backup failed. * Backup function bases on "tar" cli.')
      )
    },
    
    restoreKeys: function (source){
      // clear store
      execCMD(
        shell.rm('-rf', path.join(storePath)),
        () => console.log('Current store cleared'),
        () => console.log('Failed to clear current store.')
      )
      // restore key sets from archive file
      console.log('Extracting key sets')
      execCMD(
        shell.exec(`tar -zxvf ${source} -C ${os.homedir()}`),
        () => {
          console.log('Store restored:')
          showList()
        },
        () => console.log('Failed to restore store.')
      )
    },

    sendKey: function(host, alias) {
      let pubKeyPath = privateKeyName + '.pub'
      if (alias == null) {
        pubKeyPath = path.join(sshPath, pubKeyPath)
      } else {
        pubKeyPath = path.join(storePath, alias, pubKeyPath)
      }
      // Send the public key with ssh-copy-id
      // archive with tar command
      execCMD(
        shell.exec(`ssh-copy-id -i ${pubKeyPath} ${host}`),
        () => console.log('Identity sent.'),
        () => console.log('Send keys failed. * Send function bases on "ssh-copy-id" cli.')
      )
      
    }
    
  }
}

module.exports = generator
