# Scientific Description of the Indexing Algorithm

## Abstract

This paper introduces a novel, highly efficient indexing algorithm implemented in TypeScript. The algorithm is designed to manage large-scale datasets by leveraging a tree-based structure optimized for rapid indexing, search, and deletion operations. It accommodates unique string identifiers, akin to MongoDB ObjectIDs, ensuring clarity and performance. The algorithm is particularly well-suited for applications requiring dynamic attribute-based querying with consistent low-latency performance.

---

## Introduction

Efficient indexing algorithms are pivotal for modern data management systems. Traditional indexing structures often struggle to balance speed and memory efficiency while accommodating dynamic schemas. This work presents a groundbreaking approach that combines:

1. **Attribute-Specific Nodes**: Each attribute maintains its own node in the tree structure, enabling targeted and efficient queries.
2. **ID-Centric Design**: All data operations are indexed via unique string-based identifiers.
3. **Optimized Multi-Attribute Search**: A strategy to minimize set intersections during complex queries.
4. **Deferred Cleanup Mechanism**: To balance runtime performance with memory efficiency.

---

## Design and Implementation

### Data Structures

1. **Index Tree**:

   - Composed of a `Map` for the base storage (`idBase`) and a `Map` of attribute nodes (`nodes`).
   - Each node tracks mappings between attribute values and sets of IDs.

2. **Index Node**:

   - Attributes are stored as keys, with their values mapping to sets of IDs.

### Algorithm Details

#### Indexing Operation

- **Objective**: Insert or update a record in the index.
- **Steps**:
  1. Store the data against the provided ID in `idBase`.
  2. For each attribute-value pair in the data:
     - Retrieve or create the corresponding attribute node.
     - Add the ID to the set associated with the value.

#### Search Operation

- **Objective**: Retrieve IDs matching a specific attribute and value.
- **Steps**:
  1. Locate the node for the attribute.
  2. Retrieve the set of IDs for the specified value.

#### Multi-Attribute Search Operation

- **Objective**: Retrieve IDs matching multiple attribute-value pairs.
- **Steps**:
  1. Sort query attributes by the size of their value sets.
  2. Iteratively intersect the sets, starting with the smallest.

#### Deletion Operation

- **Objective**: Remove all mappings associated with a specific ID.
- **Steps**:
  1. Retrieve the data using the ID from `idBase`.
  2. For each attribute-value pair in the data:
     - Remove the ID from the corresponding value set.
     - Clean up empty sets or nodes as needed.
  3. Remove the ID from `idBase`.

#### Deferred Cleanup

- Periodically checks and removes empty sets and nodes.
- Triggered during batch operations or explicit maintenance calls.

---

## Optimization Strategies

1. **Attribute-Specific Nodes**:

   - Isolating attributes reduces unnecessary operations during insertion and querying.

2. **Set-Based Intersection for Multi-Attribute Search**:

   - Sorting attributes by set size minimizes computational overhead.

3. **Deferred Cleanup**:

   - Ensures the structure remains compact without frequent runtime interruptions.

4. **String-Based ID Optimization**:

   - Native JavaScript `Map` and `Set` are leveraged for efficient string key handling.

---

## Complexity Analysis

### Time Complexity

- **Indexing**: O(n), where n is the number of attributes in the data.
- **Search**: O(1) for single-attribute queries (average case).
- **Multi-Attribute Search**: O(m \* k), where m is the number of attributes in the query and k is the average size of their value sets.
- **Deletion**: O(n), proportional to the number of attributes in the data.

### Space Complexity

- Scales linearly with the number of indexed records and attributes.
- Efficient use of shared sets for duplicate values across records.

---

## Experimental Results

(TBD: Benchmark results comparing this algorithm against existing approaches, showcasing improvements in latency and memory efficiency.)

---

## Conclusion

The proposed indexing algorithm offers a robust and efficient solution for dynamic, attribute-based data queries. Its innovative design addresses common challenges in indexing large, schema-less datasets, making it a valuable tool for modern data-intensive applications. Further research could explore its integration with distributed systems and advanced caching mechanisms.

---

## Future Work

- Extending the algorithm for distributed systems with consistency guarantees.
- Enhancing batch indexing throughput using parallelism.
- Investigating adaptive strategies for skewed attribute distributions.

---

**Authors**:

- Friday (Fullstack Engineer)
