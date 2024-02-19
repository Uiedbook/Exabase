# The new distributed systems arcitecture.

## Philosophy

In the world of distributed systems, the CAP theorem is a strong factor to be consideration based on the criticality of an application, in some applications, consistency is a critical requirement like in banking systems.

Now let's go over these three factors and how observe how less emphasis on each can be a disadvantage.

- Consistency. In general purpose distributed databases: consistency is a non non-tradable factor. But however general purpose distributed database AWS Dynamo only provides eventual consistency which is less appealing for consistency critical workloads.

Consistency requires every node in the system to act like as if it is just one node in the system, in this case there shouldn't be any difference in read or consistency status in all of the nodes in the system. This ensures a synchronious behaviour across nodes which is very desirable for most applications.

- Partition tolerance. Partition tolerance aligns with Consistency and availability. and is the most critical non-tradable factor of any distributed system.

Partition tolerance means faults in some node should not dirupt the availability & Consistency factors of the entire distributed system. Hence effective replication of the system comes very handy to achieve good level of Partition tolerance.

In enssess. Consistency and Partition tolerance faults are very hard to fix if possible, and are highly desirable in any distributed infrascture.

- Availability. without a high capacity of Availability, businesses can loose money due to increased latency of their distributed system, where lantency is the time spent waiting for the system to execute. But if a distributed system is properly implemented, the system can become more available with the addition of more nodes especially in a leader-less distributed system where leadership election and followership does not exist, hence no leader-ship dependency.

"In conclussion Availability is not system critical but business critical"

In this case it is relatively cheap to solve Availability issues than figuring out how to make an inconsistent system consistent in addition with Partition tolerance, when they become a problem.

## My brief

In the past year, i have been deeply attracted and rooted in the depths of distributed systems. i am not an expert or a trained personel in this field. but a strong zealous explorer and contributor.

Over the past year i have geared my knowledge in assembling a ditributed database model. and my personal accomplishments has been quite sacrificing and satisfying at the same time.

In this post i will be uncovering some few parts of my work so far and sharing some of my knowledge.

I hope you will learn the essential needs for general purpose databases and also how to benchmark them for your use-case.

## Empiricism

This is the biggest section of this

An exabase ring is a distribution layer of two or more exabase nodes.

It incoperates the following:

Strong data consistency.
High availability/through-put.
Good partition tolerance.

The ring system tries to achieve a good maintaince of the 3 values of the CAP theorem (consistency, accessibilty, partition tolerance).

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
