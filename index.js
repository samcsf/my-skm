#! /usr/bin/env node

const program = require('commander')
const config = require('./src/config')
const mskm = require('./src/actions')(config)

mskm.initProgram()

program
  .version('0.1.0')
  .usage('<command> [options]')

program
  .command('init')
  .alias('i')
  .description('Initialize SSH key storage')
  .action(mskm.initStore)

program
  .command('create <alias> [options]')
  .alias('c')
  .description('Create SSH key with alias, support ssh-keygen options.')
  .action(mskm.createKeys)
  
program
  .command('ls')
  .alias('l')
  .description('List all the stored keys')
  .action(mskm.showList)

program
  .command('use <alias>')
  .alias('u')
  .description('Change keyset to current use')
  .action(mskm.switchKeys)

program
  .command('remove <alias>')
  .alias('rm')
  .description('Remove SSH with alias')
  .action(mskm.deleteKeys)

program
  .command('rename <alias> [newAlias]')
  .alias('rn')
  .description('Rename SSH key to new alias')
  .action(mskm.renameKeys)

program
  .command('backup <target>')
  .alias('b')
  .description('Backup store to <target> achive file.')
  .action(mskm.backupKeys)

program
  .command('restore <source>')
  .alias('r')
  .description('Restore from <source> achive file.')
  .action(mskm.restoreKeys)

program
  .command('send <host> [options]')
  .alias('s')
  .description('Send identity to <host>, support ssh-copy-id options.')
  .action(mskm.sendKey)

program.parse(process.argv)

