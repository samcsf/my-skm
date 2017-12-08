const fs = require('fs')

function cmpSymLink(linkPath, filePath) {
  try{
    if(fs.lstatSync(linkPath).isSymbolicLink()){
      let refPath = fs.readlinkSync(linkPath)
      return refPath === filePath
    }
  }catch(err){
    // console.log('Error in cmpSymLink(): ' + err)
    return false
  }
  return false
}

function execCMD(res, succ, fail) {
  if (res.code === 0)
    return succ(res)
  // fail
  console.log(res.stderr)
  if (fail !== undefined && typeof fail === 'function' )
    return fail(res)
}

module.exports = {
  cmpSymLink,
  execCMD
}