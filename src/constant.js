const path = require('path')
const DEFAULT_DIR_NAME = 'mskm'
const DEFAULT_CONF_NAME = 'state.json' 
const STORE_PATH = path.join('/Users/sam/JS_Study/my-skm', DEFAULT_DIR_NAME) 
const STORE_CONF_PATH = path.join(STORE_PATH, DEFAULT_CONF_NAME) 
const USER_SSH_STORE = path.join('/Users/sam/JS_Study/my-skm', 'ssh') 
const KEY_PRIFIX = 'id_rsa'

module.exports = {
  DEFAULT_DIR_NAME,
  DEFAULT_CONF_NAME,
  STORE_PATH,
  STORE_CONF_PATH,
  USER_SSH_STORE,
  KEY_PRIFIX
}