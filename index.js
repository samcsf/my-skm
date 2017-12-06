#! /bin/env node

const program = require('commander')
const config = require('./src/config')
const {
  initProgram, 
  initStore, 
  createKeys, 
  showList, 
  switchKeys, 
  deleteKeys, 
  renameKeys
} = require('./src/actions')(config)

initProgram()

program
  .version('0.1.0')
  .usage('<command> [options]')

program
  .command('init')
  .alias('i')
  .description('Initialize SSH key storage')
  .action(initStore)

program
  .command('create <alias> [options]')
  .alias('c')
  .description('Create SSH key with alias, support ssh-keygen options.')
  .action(createKeys)
  
program
  .command('ls')
  .alias('l')
  .description('List all the stored keys')
  .action(showList)

program
  .command('use <alias>')
  .alias('u')
  .description('Change keyset to current use')
  .action(switchKeys)

program
  .command('remove <alias>')
  .alias('rm')
  .description('Remove SSH with alias')
  .action(deleteKeys)

program
  .command('rename <alias> [newAlias]')
  .alias('rn')
  .description('Rename SSH key to new alias')
  .action(renameKeys)

program.parse(process.argv)

