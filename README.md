# TODOs

*   set timeout to remove master password from memory. This makes safe
    stronger, but forces user to type the password again and again.

# Test workflow

# with password dialog

    sweetp -u http://localhost:7788 password manager authenticate
    sweetp -Pusername=foo -u http://localhost:7788 password manager set
    sweetp -Pkey=test -u http://localhost:7788 password manager get

# without password dialog

    sweetp -u -PmasterPassword=foobar http://localhost:7788 password manager authenticate
    sweetp -Pusername=foo -Ppassword=bar -u http://localhost:7788 password manager set
    sweetp -Pkey=test -u http://localhost:7788 password manager get
