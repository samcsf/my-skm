![](./img/logo.png)  
[![Build Status](https://travis-ci.org/samcsf/my-skm.svg?branch=dev)](https://travis-ci.org/samcsf/my-skm)
[![codecov](https://codecov.io/gh/samcsf/my-skm/branch/dev/graph/badge.svg)](https://codecov.io/gh/samcsf/my-skm)
[![MIT licensed](https://img.shields.io/dub/l/vibe-d.svg)](LICENSE) 

One of the SSH Keys Manager implementation in Node.js. Inspired by [TimothyYe/skm](https://github.com/TimothyYe/skm/blob/master/README.md) , which is written in go language.

## Features

- Create new SSH and named with alias
- Manage the SSH keys with alias (Delete/Rename/List)
- Switch default SSH keys (in ~/.ssh) with alias
- Archive/Restore SSH keys
- Copy key to remote host

## Installation
```shell
npm install -g my-skm
```

## Usage
#### Overview
```
  Usage: mskm <command> [options]


  Options:

    -V, --version  output the version number
    -h, --help     output usage information


  Commands:

    init|i                        Initialize SSH key storage
    create|c <alias> [options]    Create SSH key with alias, support ssh-keygen options.
    ls|l                          List all the stored keys
    use|u <alias>                 Change keyset to current use
    remove|rm <alias>             Remove SSH with alias
    rename|rn <alias> [newAlias]  Rename SSH key to new alias
    backup|b <target>             Backup store to <target> achive file.
    restore|r <source>            Restore from <source> achive file.
    send|s <host> [options]       Send identity to <host>, support ssh-copy-id options.
```
#### Initialize key store
Before using the command, initialize is required. It will try to create the key store for user keys. If there's already keys in ~/.ssh, it will be saved as alias 'default'.
```
mskm init
```
#### Create SSH key
Create a SSH key with alias(based on SSH-KEYGEN), supported options of [SSH-KEYGEN](https://www.ssh.com/ssh/keygen/), such as comment (-C [comment]).
```
mskm create <alias> [options]
```
#### List SSH keys
List all the SSH key sets in store.
```
mskm ls
```
Key in using will be hignlighted with arrow mark '->'.
```
    dev
 -> prod
    test
```
#### Use SSH key
Change default key(in ~/.ssh) to alias key set.
```
mskm use <alias>
```
#### Rename SSH key
Rename the alias.
```
mskm rename <alias> <newAlias>
```
#### Remove SSH key
Remove the alias from store
```
mskm remove <alias>
```

#### Archive the key store
Archive all the alias in store to specific path.
```
mskm backup <target>
```
#### Restore the key store
Restore all the alias from archiver in specific path.
```
mskm restore <source>
```
#### Send keys
Send the inusing identity to remote host, support ssh-copy-id options.
```
mskm send <host> [options]
```

## License

[MIT License](https://github.com/samcsf/my-skm/blob/dev/LICENSE)
