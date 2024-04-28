# The new distributed systems arcitecture.

## Philosophy

In the world of distributed systems, the CAP theorem is a strong factor to be consideration based on the criticality of an application, in some applications, consistency is a critical requirement like in banking systems.

Now let's go over these three factors and how observe how less emphasis on each can be a disadvantage.

- Consistency. In general purpose distributed databases: consistency is a non non-tradable factor. But however general purpose distributed database AWS Dynamo only provides eventual consistency which is less appealing for consistency critical workloads.

Consistency requires every node in the system to act like as if it is just one node in the system, in this case there shouldn't be any difference in read or consistency status in all of the nodes in the system. This ensures a synchronous behavior across nodes which is very desirable for most applications.

- Partition tolerance. Partition tolerance aligns with Consistency and availability. and is the most critical non-tradable factor of any distributed system.

Partition tolerance means faults in some node should not disrupt the availability & Consistency factors of the entire distributed system. Hence effective replication of the system comes very handy to achieve good level of Partition tolerance.

In essence. Consistency and Partition tolerance faults are very hard to fix if possible, and are highly desirable in any distributed infrastructure.

- Availability. without a high capacity of Availability, businesses can loose money due to increased latency of their distributed system, where latency is the time spent waiting for the system to execute. But if a distributed system is properly implemented, the system can become more available with the addition of more nodes especially in a leader-less distributed system where leadership election and followership does not exist, hence no leader-ship dependency.

"In conclusion Availability is not system critical but business critical"

In this case it is relatively cheap to solve Availability issues than figuring out how to make an inconsistent system consistent in addition with Partition tolerance, when they become a problem.

## My brief

In the past year, i have been deeply attracted and rooted in the depths of distributed systems. i am not an expert or a trained personnel in this field. but a strong zealous explorer and contributor.

Over the past year i have geared my knowledge in assembling a distributed database model. and my personal accomplishments has been quite sacrificing and satisfying at the same time.

In this post i will be uncovering some few parts of my work so far and sharing some of my knowledge.

I hope you will learn the essential needs for general purpose databases and also how to benchmark them for general use-case.

## Empiricism

This is the biggest section of this

An exabase ring is a distribution of two or more exabase nodes.

It incorporates the following features:

Data consistency.

Good availability/through-put.

Good partition tolerance.

The ring system tries to achieve a good maintenance of the 3 values of the CAP theorem (consistency, accessibility, partition tolerance).

More info later on.

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

Distributed Systems
An Algorithmic Approach
Second Edition
Sukumar Ghosh

---

program 2PC
{program for the coordinator}
{Phase 1: prepare}
Send PREPARE to all participants;
Wait to receive the vote (yes or no) from each participant
{Phase 2: commit}
if ∀participant j: vote(j) = yes → multicast COMMIT to all
participants
[] ∃ participant j: vote (j) = no → multicast ABORT to all
participants
fi
{program for each participant}
if {Phase 1} message from coordinator = PREPARE → send yes or no
[] {Phase 2} message from coordinator = COMMIT → commit local actions
[] {Phase 2} message from coordinator = ABORT → abort local actions
fi

program 3PC
{program for the coordinator}
{Phase 1: prepare} Send PREPARE to all participants;
Wait to receive the vote from each participant
{Phase 2: prepare to commit}
if ∀ participant j: vote(j) = commit → multicast PRECOMMIT to all
participants;
wait to receive ack from
the participants
[] ∃participant j:vote (j)=abort → multicast ABORT to all participants
fi
{Phase 3: commit}
if majority of participants sends ack → multicast COMMIT to all
participants;
[] majority does not send ack → multicast ABORT to all participants
fi
{program for each participant}
if {Phase 1} message from coordinator = PREPARE → send commit or abort
[] {Phase 2} message from coordinator = PRECOMMIT → send ack
[] {Phase 3} message from coordinator = COMMIT → commit local actions
[] {Phases 2 and 3} message from coordinator = ABORT → abort
local actions
fi
