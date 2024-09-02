This is a list of proposals for the Exabase database engine.
db shall represent the Exabase project

# 1. proposal

make writes faster
how?

Store writes on a key derived from (_id + _ + wal)
exp: 623874ey63dcuid_wal
where the value is the data

These keys should be tracked in memory and reconcilled with their specified log files at regular interval (10 minute max)
Reads and writes should match these keys before hitting the logs files.

This approach with make writes super fast without affecting db ACID status.

# 2. make db fulfill the json as query promise, entirely no other method for querying db.

Then create external ODM that maps out json queries for db

structure - commands, queries.

support commands

1.  schema - create, migration
2.  connect to another instance
3.  push data to new replica
4.

query formart - json

query types

count
logCount
select - take, sortBy, skip, populate
search - take, sortBy, skip, populate
delete
update
save
add relationship
remove relationship

# 3. attachable storage engine

The db should be able to use multiple storage engines like local file system, kv databases like Dynamodb, deno kv, cf kv.
