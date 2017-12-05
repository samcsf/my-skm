const shell = require('shelljs')
const fs = require('fs')
const path = require('path')
const {getState, setState, execCMD} = require('./utils')
const {
  DEFAULT_DIR_NAME,
  DEFAULT_CONF_NAME,
  STORE_PATH,
  STORE_CONF_PATH,
  USER_SSH_STORE,
  KEY_PRIFIX,
} = require('./constant')

function initProgram(){
  // override create mode's parameters to avoid 'unknown option error'
  let argv = process.argv
  if (argv[2] === 'create' || argv[2] === 'c') {
    let bypassOpts = '"' + argv.slice(4).join(' ') + '"'
    argv = argv.slice(0, 4).concat([bypassOpts])
    process.argv = argv
  }
}

function showList(){
  // load state
  let current = getState().current
  // output 
  for(let d of fs.readdirSync(STORE_PATH)){
    if (!fs.statSync(path.join(STORE_PATH, d)).isDirectory()) {
      continue
    }
    let arrow = ' ->'
    let space = '   '
    console.log(`${d === current ? arrow : space} ${d}`)
  }
}

function initStore() {
  console.log('Try to initialize the key store.')
  // check store existense
  try{
    fs.mkdirSync(STORE_PATH)
  }catch(err){
    if (err.code === 'EEXIST'){
      console.log('mskm already initialized')
      console.log('Please remove ' + STORE_PATH + ' if you need to re-initilize.')
      return 
    }
  }
  // check keys in default location, if exists backup to alias default
  let backups = []
  let items = fs.readdirSync(USER_SSH_STORE)
  for(let i of items){
    if (i === KEY_PRIFIX || i === (KEY_PRIFIX + '.pub')) {
      backups.push(i)
    }
  }
  if (backups.length > 0) {
    fs.mkdirSync(path.join(STORE_PATH, 'default'))
    backups.forEach(f =>{
      fs.copyFileSync(path.join(USER_SSH_STORE, f), path.join(STORE_PATH, 'default', f))
    })
    setState('current', 'default')
  } else {
    setState('current', '')
  }
  console.log('Initialization completed. mskm is ready.')
}

function switchKeys(alias){
  // check alias
  if(!fs.existsSync(path.join(STORE_PATH, alias)))
    return false
  if (getState().current === alias) {
    console.log('Already using ' + alias)
    showList()
    return false
  }
  // remove from user store
  try{
    console.log('Try to clear user keys')
    fs.unlinkSync(path.join(USER_SSH_STORE, KEY_PRIFIX))
    fs.unlinkSync(path.join(USER_SSH_STORE, KEY_PRIFIX + '.pub'))
    console.log('Cleared')
  } catch(err) {
    console.log('Nothing to clear, continue')
  }
  // copy keys
  fs.copyFileSync(path.join(STORE_PATH, alias, KEY_PRIFIX), path.join(USER_SSH_STORE, KEY_PRIFIX))
  fs.copyFileSync(path.join(STORE_PATH, alias, KEY_PRIFIX + '.pub'), path.join(USER_SSH_STORE, KEY_PRIFIX + '.pub'))
  console.log('Keys of ' + alias + ' already copied to user store')
  console.log('Now using ' + alias)
  // update state
  setState('current', alias)
  showList()
  return true
}

function checkAliasExist(alias) {
  return fs.existsSync(path.join(STORE_PATH, alias))
}

function checkAliasInUse(alias) {
  if(!checkAliasExist(alias))
    return false
  return getState().current === alias
}

function createKeys(alias, options) {
  // exit when creating duplicate alias
  if (checkAliasExist(alias)) {
    console.log('This alias already exists, can not create duplicate names')
    return
  }
  options = JSON.parse(options) // To remove quote mark "" 
  console.log('Try to create new key with alias ' + alias + ' and options ' + options)
  // create sub-directory
  let aliasPath = path.join(STORE_PATH, alias)
  fs.mkdirSync(aliasPath)
  // generate keys with ssh-keygen
  execCMD(
    shell.exec('ssh-keygen ' + options + ' -f ' + path.join(aliasPath, KEY_PRIFIX)),
    () => console.log('Key created with alias: ' + alias),
    () => console.log('Key created fail.')
  )
}

function deleteKeys(alias) {
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
    shell.rm('-rf', path.join(STORE_PATH, alias)),
    () => console.log('Remove done.'),
    () => console.log('Remove failed.')
  )
}

function renameKeys(alias, newAlias) {
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
    shell.mv(path.join(STORE_PATH, alias), path.join(STORE_PATH, newAlias)),
    () => {
      // rename state if alias is using
      if (isInUse) {
        setState('current', newAlias)
      }
      console.log(alias + ' successfully renamed to ' + newAlias)
    },
    () => console.log('Rename failed.')
  )
}

module.exports = {
  initProgram,
  initStore,
  createKeys,
  switchKeys,
  renameKeys,
  deleteKeys,
  showList
}
