function hookConsole(logger, target){
  return function (...args) {
    logger.apply(null, args)
    target.push(args[0])
  }
}

module.exports = {hookConsole}