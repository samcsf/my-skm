const path = require('path')
const os = require('os')
const defaultDir = '.mskm'
const storePath = path.join(os.homedir(), defaultDir) 
const sshPath = path.join(os.homedir(), '.ssh') 
const privateKeyName = 'id_rsa'

module.exports = {
  storePath,
  sshPath,
  privateKeyName
}