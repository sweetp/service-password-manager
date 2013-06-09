# Description

[![NPM version](https://badge.fury.io/js/sweetp-password-manager.png)](http://badge.fury.io/js/sweetp-password-manager)

This services can manage passwords in a simple way, accessable by other
services. The password are stored encrypted in a json file in the `.sweetp`
directory. The main purpose of this service is to prevent the storage of clear
text passwords in files on your harddisc. Its not the most secure password
manager built by human kind!

# TODOs

*   set timeout to remove master password from memory. This makes safe
    stronger, but forces user to type the password again and again.

# Usage

## with password dialog (called by user)

    sweetp -u http://localhost:7788 password manager authenticate
    sweetp -Pusername=foo -u http://localhost:7788 password manager set
    sweetp -Pkey=test -u http://localhost:7788 password manager get

## without password dialog (called by service)

    sweetp -u -PmasterPassword=foobar http://localhost:7788 password manager authenticate
    sweetp -Pusername=foo -Ppassword=bar -u http://localhost:7788 password manager set
    sweetp -Pkey=test -u http://localhost:7788 password manager get
