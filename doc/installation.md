# Introduction

Backend System consists of two servers

1. MongoDB Database Server 
2. REST API Server  

# Setting up MongoDB  

MongoDB >= 3.2.x is required.

Follow instruction on how to [Install MongoDB Community Edition on Ubuntu] (https://docs.mongodb.com/v3.2/tutorial/install-mongodb-on-ubuntu/).  

We recommend free and open source [native and cross-platform MongoDB manager](https://robomongo.org/)

## Configure Public Access

In order to connect to MongoDB remotely make sure Firewall pathrough mongodb port 

Check configuration with local ip and port here:

`$ cat /etc/mongod.conf` 

The next step is to install REST API Server which will use our newly installed MongoDB.

# Setting up REST API Server

Our current system is installed on Ubuntu Server 14.04 LTS (HVM)

1. Setup NodeJS v4.x
2. Download REST API Source code.
3. Install dependency. 
4. Configuring Database access.
5. Launch REST API Server. (TBD)

## Setup NodeJS v4.x

Follow instruction on how to install [NodeJS v4.x](https://github.com/nodesource/distributions#deb)

    # Using Ubuntu
    curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash -  
    sudo apt-get install -y nodejs  

Then we set up a package root in homedir to hold the NodeJS "global" packages:

### Configure `homedir` for NodeJS "global" pacakges

    $ NPM_PACKAGES="$HOME/.npm-packages"
    $ mkdir -p "$NPM_PACKAGES"

Set NPM to use this directory for its global package installs:

    $ echo "prefix = $NPM_PACKAGES" >> ~/.npmrc

Configure your PATH and MANPATH to see commands in your $NPM_PACKAGES prefix by adding the following to your .zshrc/.bashrc:

    # NPM packages in homedir
    NPM_PACKAGES="$HOME/.npm-packages"

    # Tell our environment about user-installed node tools
    PATH="$NPM_PACKAGES/bin:$PATH"
    
    # Unset manpath so we can inherit from /etc/manpath via the `manpath` command
    unset MANPATH  # delete if you already modified MANPATH elsewhere in your configuration
    MANPATH="$NPM_PACKAGES/share/man:$(manpath)"

    # Tell Node about these packages
    NODE_PATH="$NPM_PACKAGES/lib/node_modules:$NODE_PATH"

## Download REST API Source code

You can add your server SSH Key to git for authentication by following [adding a new SSH key to your GitHub account](https://help.github.com/articles/adding-a-new-ssh-key-to-your-github-account/) instruction.

Choose your own method [how to obtain source code] (https://help.github.com/articles/which-remote-url-should-i-use/). In our example we cloning using HTTPs method

    $ git clone https://github.com/waqarz/VR-IF-Database.git
    $ cd VR-IF-Database
    $ npm install

You could also download ZIP Archive https://github.com/waqarz/VR-IF-Database/archive/master.zip 

    $ unzip master.zip
    $ cd VR-IF-Dataset-master
    $ npm install

## Configuring Database access

Change MongoDB connection string in `app.js` https://github.com/waqarz/VR-IF-Database/blob/master/app.js#L30

    var mongoose_uri = process.env.MONGOOSE_URI || "172.17.0.2/dashif-db";

## C++ bson extension

Find in npm module mongodb ..node_modules\mongodb\node_modules\bson\ext\index.js

and change path to js version in catch block

    bson = require('../build/Release/bson');
to   
    
    bson = require('../browser_build/bson');

### Launch REST API Server.

If this is a new setup you can add some test datasets 

    cd datasets
    node create_dataset.js
    node create_acl.js
    
Make sure `create_dataset.js` and `create_acl.js` points to the valid MongoDB URL

    cd ..
    npm start
