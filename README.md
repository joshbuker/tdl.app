# TDL App - Vue Prototype

This is intended as a testbed for the client **AND** server side logic. The code
here will be thrown away, but should be useful for rapid prototyping and testing
out various UI options.

## Requirements

### Windows

* Docker Desktop for Windows

See: https://docs.docker.com/docker-for-windows/install/

### Mac OS X

* Docker Desktop for Mac

See: https://docs.docker.com/docker-for-mac/install/

### Linux

* Docker (specific to distro)
* Docker Compose

See: https://docs.docker.com/compose/install/

## Build

`docker-compose build`

## Setup

Create: `docker-compose run web rails db:create db:migrate db:seed`

Recreate: `docker-compose run web rails db:drop db:create db:migrate db:seed`

## Running Locally

Interactive console: `docker-compose run web rails c`

Specs: `docker-compose run web rspec spec`

Server: `docker-compose up`

## Running Locally sans Docker

#### Required Packages:
* rvm
* nvm
* yarn
* postgresql

#### Procedure:
* rvm install 2.6.5
* rvm use
* nvm install 13.0.1
* nvm use 13.0.1
* gem install bundler
* bundle install
* yarn install --check-files
* rails db:create db:migrate db:seed
* rspec spec
* rails s
