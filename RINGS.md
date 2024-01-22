An exabase ring is a distribution layer of one or more exabase nodes.

It features the following:

Strong data consistency.
High availability/through-put.
Good partition tolerance.

The ring system tries to achieve a good mantaince of the 3 values of the CAP theorem (consistency, accessibilty, partition tolerance).

more valid info later on.

A transaction is complete set of communication across nodes in an exabase ring.

When a client issues a read or write request, the contacted node will become its coordinator.

“Consistency”
I ACID: a transaction transforms the database from one
“consistent” state to another
Here, “consistent” = satisfying application-specific
invariants
e.g. “every course with students enrolled must have at
least one lecturer”
I Read-after-write consistency (lecture 5)
I Replication: replica should be “consistent” with other
replicas
“consistent” = in the same state? (when exactly?)
“consistent” = read operations return same result?
I Consistency model: many to choose from
