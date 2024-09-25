# JSON Query Language (JQL) Specification

| Introduction

JQL is a json as a query schema. the structure of which has be analysed and implemented in the exabse database.

Why not sql?

In traditional SQL-based query languages, while powerful, can be complex and difficult to integrate into modern, JSON-centric applications. To address this gap, we introduce JSON Query Language (JQL), a lightweight, JSON-based query schema designed to streamline database interactions.

JQL is designed to bring similarity and ease between object pattern in applications and the database query formart, offering a syntax that is intuitive. By leveraging JSON, JQL aligns naturally with modern data structures, making it an ideal choice for developers who seek simplicity.

| Benefits?

1. JSON-Centric Design
   The JSON format is ubiquitous in modern web and mobile applications. By using JSON as the query language, JQL provides a seamless experience for developers already familiar with JSON data structures, reducing the learning curve and improving productivity.

2. Human-Readable Syntax
   JQL is designed with readability in mind. Its syntax is clear and intuitive, allowing developers to quickly write, understand, and maintain queries without requiring deep expertise in complex query languages.

3. Flexibility and Power
   Despite its simplicity, JQL does not compromise on power. It supports a wide range of operations, including whereing, sorting, projecting, and updating data. These operations are expressed in a structured and logical manner, making it easy to construct complex queries.

Query Structure
A JQL query is a JSON object that consists of various key-value pairs representing the components of the query. Below is an overview of the main components and how they work together.

1. Table
   Specifies the target table or table for the query.

```json
"table": "users"
```

2. Action
   Defines the operation to be performed. The common actions are find, insert, update, and delete.

```json
"action": "find"
```

3.  Where
    Specifies the conditions that data must meet to be included in the result set. Where support a range of comparison and logical operators.

```json
"where": {
"age": { "$gt": 25 },
"status": "active"
}
```

4.  Pick
    Determines which fields are included or excluded in the result set.

```json
"pick": ["name", "email"]
```

5.  Sort
    Defines the order in which results are returned. Use ASC for ascending order and DESC for descending order.

```json
"sort": { "age": "DESC" }
```

6.  Limit and Skip
    Controls the number of results returned (take) and the number of results to skip (skip), useful for pagination.

```json
"take": 10,
"skip": 5
```

7.  Update
    Used for update operations, specifying the fields to modify and the corresponding values.

```json
"update": {
"$set": { "status": "inactive" }
}
```

8.  Insert
    Specifies the documents to be inserted into the table.

```json
"insert": [
{ "name": "John Doe", "age": 28 },
{ "name": "Jane Smith", "age": 32 }
]
```

9. Operators

JQL supports a variety of operators for building complex queries. These operators are grouped into comparison, logical, and update categories.

1. Comparison Operators

- $eq: Equal to
- $ne: Not equal to
- $gt: Greater than
- $gte: Greater than or equal to
- $lt: Less than
- $lte: Less than or equal to
- $in: Matches any value in an array
- $nin: Does not match any value in an array

2. Logical Operators

- $and: Logical AND
- $or: Logical OR
- $not: Logical NOT
- $nor: Logical NOR

3. Update Modifiers

- $set: Sets the value of a field
- $unset: Removes a field
- $inc: Increments the value of a field
- $push: Appends a value to an array field
- $pull: Removes a value from an array field

### Example Queries

4. Find Query
   Retrieve all active users over the age of 25, displaying only their names and email addresses, sorted by age in ascending order.

```json
{
  "table": "users",
  "action": "find",
  "where": {
    "age": { "$gt": 25 },
    "status": "active"
  },
  "pick": ["name", "email"],
  "sort": { "age": 1 },
  "take": 10,
  "skip": 5
}
```

2.  Insert Query
    Insert multiple products into the products table.

```json
{
  "table": "products",
  "action": "insert",
  "insert": [
    { "name": "Laptop", "price": 999, "category": "electronics" },
    { "name": "Smartphone", "price": 499, "category": "electronics" }
  ]
}
```

3.  Update Query
    Update the status of users older than 30 to "inactive".

```json
{
  "table": "users",
  "action": "update",
  "where": { "age": { "$gt": 30 } },
  "update": {
    "$set": { "status": "inactive" }
  }
}
```

4.  Delete Query
    Delete users who have not been active for over a year.

```json
{
  "table": "users",
  "action": "delete",
  "where": {
    "lastActive": { "$lt": "2023-08-29T00:00:00Z" }
  }
}
```

| Conclusion

JQL is designed to be a versatile and intuitive query language that fits naturally into modern development workflows. Its JSON-based structure makes it an excellent choice for developers who value clarity and ease of use. By offering powerful query capabilities without the complexity of traditional SQL, JQL empowers developers to build scalable, maintainable, and efficient applications with minimal friction.
