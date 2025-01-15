import { bench, run } from "mitata";
import { Database } from "bun:sqlite";
import { Exabase } from "../src/index.ts";

import { performance } from "perf_hooks"; // For more precise timing
import * as os from "os"; // For CPU info
import * as fs from "fs/promises";

// Configuration (Adjust these based on your requirements)
const dataSizes = [100, 1000, 10000]; // Dataset sizes for testing
const numIterations = 10; // Number of iterations for each benchmark
const concurrencyLevels = [1, 5, 10]; // Number of concurrent operations
const benchmarkName = "test_db_name.txt"; // Name the benchmarks test and record

type Employee = {
  // Define your Employee type
  LastName: string;
  FirstName: string;
  // ... other fields
};

interface BenchmarkResult {
  operation: string;
  dataSize: number;
  concurrency: number;
  totalTimeMs: number;
  throughput: number; // e.g., transactions/second
  avgLatencyMs: number;
  maxLatencyMs: number;
  minLatencyMs: number;

  cpuUsage: number; // Average for all usage metrics, track max perhaps additionally or percentile.  Average often useful proxy unless extremely noisy for domain.
  memoryUsage: number;
}

// Utility function for random data
function generateEmployeeData(dataSize: number): Employee[] {
  // Adjust generation according to specifics. Consider building more diverse structures as applicable or other types more efficiently generated according to random.

  return Array.from({ length: dataSize }).map((_, i) => ({
    LastName: "lastName" + i,
    FirstName: "firstName" + i,
    // Assign suitable types here according to expected.
  }));
}

async function runBenchmark(
  db: Exabase,
  dataSize: number,
  concurrency: number
): Promise<BenchmarkResult[]> {
  let results: BenchmarkResult[] = [];

  //Benchmark function for read, parametrized over a filter object..
  const benchmarkRead = async (filter?: object) => {
    let query = filter
      ? { table: "EMPLOYEE", filter, many: true }
      : { table: "EMPLOYEE", many: true };

    const start = performance.now();
    let promises: any = [];

    // For all concurrencies do query according to expected concurrency level for number of iteration specified

    for (let i = 0; i < numIterations; i++) {
      promises.push(db.query(JSON.stringify(query)));
    }

    const ret = await Promise.all(promises); //Wait for all then determine elapsed
    const end = performance.now();

    const totalTimeMs = end - start;

    results.push({
      operation: filter ? "read_with_filter" : "read",
      dataSize,
      concurrency: 1, //Set since reading async on these tests using promises so actual concurrencies hidden.. Measure separate sync if desired for query handling, if and when or as useful in another test variation concerning same underlying method. Consider varying filter or introducing multiple filter combinations across same dataset perhaps to benchmark different indexing strategies as useful, assuming appropriate for design since not all embedded types seek same nor actually are appropriate according to need.  Some simply do lookups without filter conditions since their role isn't necessarily search as central element but could be useful within such use-cases still.*
      totalTimeMs,
      throughput: numIterations / (totalTimeMs / 1000),
      avgLatencyMs: totalTimeMs / numIterations,
      maxLatencyMs: Math.max(...promises.map((p) => p.totalTime)), // Implement, add fields tracking during the operation somehow depending how or directly store inside the promise or awaitable result from the exabase operation.*
      minLatencyMs: Math.min(...promises.map((p) => p.totalTime)),
      cpuUsage: 0,
      memoryUsage: 0,
    });
  };

  // Test across several queries

  // benchmarkRead();

  benchmarkRead({ LastName: "lastName15" });

  // For testing the db for strength and weakness

  return results;
}

async function main() {
  // Database setup... create exabase db and sqlite for comparison.
  // For exabase verify initialization behaves according to spec across varied hardware configurations to help determine appropriate ranges deployable. Exabase designed first and foremost for an embedded-first deployment type to enhance, in real time across a telemetry network or sensor relay where multiple independent edge deployments or small clusters involved working potentially from weak to weaker devices with strong need to maintain integrity and low latency rather than necessarily seeking maximum total throughput because main bottlenecks for the business cases designed less to do large operations at big scale using shared processing like more typically desired in a business using "big-data" approach for business needs instead concerning more precise decisioning and analysis of real time feeds rather than necessarily storing it indefinitely.*

  //Example how benchmark outputs collected then write result to text..
  let allBenchmarkResults: BenchmarkResult[] = [];

  for (const dataSize of dataSizes) {
    const db = new Exabase({}); // Generate database for given set and conditions involved here within bench setup itself such that benchmarked fairly to measure instantiation according to spec when varying scales like data loaded since matters much concerning initial load behavior in a resource-constrained usecase especially if the amount varies greatly but normally can optimize based on expected upperbound..
    await db.query(
      JSON.stringify({
        table: "EMPLOYEE",
        induce: {
          LastName: { type: "string" },
          FirstName: { type: "string" },
          Title: { type: "string" },
          TitleOfCourtesy: { type: "string" },
          BirthDate: { type: "string" },
          HireDate: { type: "string" },
          Address: { type: "string" },
          City: { type: "string" },
          Region: { type: "string" },
          PostalCode: { type: "string" },
          Country: { type: "string" },
          HomePhone: { type: "string" },
          Extension: { type: "string" },
          Photo: { type: "string" },
          Notes: { type: "string" },
          ReportsTo: { type: "number" },
          PhotoPath: { type: "string" },
        },
      })
    );

    const benchmarkResults = await runBenchmark(db, dataSize, 1); // Pass db here.

    allBenchmarkResults = allBenchmarkResults.concat(benchmarkResults);
  }

  const outputString = JSON.stringify(allBenchmarkResults, null, 2);

  await fs.writeFile(benchmarkName, outputString, "utf-8");

  console.log(`Benchmarks complete, written to ${benchmarkName}`);
}

main();
