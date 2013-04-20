Test workflow:

    sweetp -u http://localhost:7788 password manager authenticate
    sweetp -Pusername=foo -Ppassword=bar -u http://localhost:7788 password manager set
    sweetp -Pkey=test -u http://localhost:7788 password manager get
