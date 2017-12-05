const {STORE_CONF_PATH} = require('./constant')
const fs = require('fs')

function getState() {
  try {
    return JSON.parse(fs.readFileSync(STORE_CONF_PATH))
  }catch(e){
    return {}
  }
}

function setState(k, v) {
  let state = getState()
  state[k] = v
  fs.writeFileSync(STORE_CONF_PATH, JSON.stringify(state))
}

function execCMD(res, succ, fail) {
  if (res.code === 0)
    return succ(res)
  // fail
  console.log(res.stderr)
  return fail(res)
}

module.exports = {
  getState,
  setState,
  execCMD
}