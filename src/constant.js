const path = require('path')
const DEFAULT_DIR_NAME = 'mskm'
const STORE_PATH = path.join('/Users/sam/JS_Study/my-skm', DEFAULT_DIR_NAME) 
const USER_SSH_STORE = path.join('/Users/sam/JS_Study/my-skm', 'ssh') 
const KEY_PRIFIX = 'id_rsa'

module.exports = {
  storePath: STORE_PATH,
  sshPath: USER_SSH_STORE,
  privateKeyName: KEY_PRIFIX
}