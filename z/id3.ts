import { bench, run } from "mitata"; // Or k6, wrk2, etc.
import { Exabase } from "../src";
// ... other imports (os, fs, etc. as before)

// Dataset Configuration (Replace with your data generation or import)

async function generateProducts(numProducts: number): Promise<any[]> {
  let products: any = [];
  for (let i = 0; i < numProducts; i++) {
    products.push({
      name: "Product " + i,
      category: "Category " + (i % 10),
      price: Math.random() * 100, // Vary for realism as wanted. Could generate from particular range with specified boundaries around those deemed mostly interesting/likely in practice for anticipated typical product offering usecases.*
      description: "This is product " + i, // Use suitable mock value if intended benchmarking or intended as a feature around full text queries later especially if comparing between mongo as main design motivation then this aspect may need evaluated thoroughly if aiming overperform against industry leaders when such benchmarks well measured or likely relevant from real scenarios rather than trivial to build since query optimization particularly complex space when scaling generally.*  Avoid overly simplifying. Some types might want testing specifically here, potentially depending language and representation used to evaluate the character representation used relative to storage cost of fields or for fields where numbers matter to be able to categorize or cluster on those or do indexing specifically on that value range when optimizing across some types from database (such as on those supporting full-text search generally requiring and having optimized libraries dedicated rather than doing naively or trivially such as might suffice in certain kind lower level cases around embedding engines).*
      reviews: [], // Or generate an array of review values/texts appropriately generated here also depending test required.*   // Array of reviews (add realistic subdocuments or add mocking for such in later expansion and test cases). Adjust if using Mongo structure or alike where nested-schemas exist frequently then generate such hierarchy in test.*  For embedded also frequently depends exactly type of schema whether array types make any sense to support at level where query support could exist if at all depending whether used as simply persistence than intended for search operations in such case probably easier converting structure before insertion like flattening into table during insertion via bespoke transformation).*
    });
  }

  return products; //Consider which dataset generated according to realistic expectations based on likely anticipated scaling considerations since certain sizes might overwhelm smaller embedded engines from resource exhaustion from initialization or even potentially lead unexpected results (if db implementation contains very tricky assumptions about structure data or limitations size certain type then might fail, potentially in way not noticed until far later depending rigor involved in fuzz test during low-level). Consider randomly permuting order from list randomly in some benchmark case to evaluate and ensure database insert behaves always as intended compared to expected sort where implementation differences sorting can occasionally become surprisingly obvious even across benchmarks measuring only using simple integer keys).*
}

async function prepareDatabase(exabase: Exabase, numProducts: number) {
  // drop or clear out old entries from previous benchmark sweeps before repopulating or adjust otherwise method from which to re-run clean instance.*
  //  try {await exabase.query(JSON.stringify({ drop: "products" }))} //Exabase analog or check similar.. adapt based on db API. Be very careful here such that testing done against realistic condition in setup from expected start normally done in deployed database if clearing old state from previous attempt like would be normally anticipated workflow when re-running benchmarks such that the starting and initialization part not hidden or skipped.*

  // adjust according expected collection structure for product items or change those where applicable.. Mongo itself can use unstructured then populate the schema later from data or set preemptively at time creation. This could or would itself introduce difference in results where time to do creation itself for tables differs potentially to substantial degree according to initial table declaration or during generation dataset.. Test if initialization time matters where benchmarks involve such steps.*
  // await exabase.query({create: "products"});  // adjust create syntax appropriately for expected mongo equivalent..

  let promises: any[] = [];

  let productBatch = await generateProducts(numProducts);

  for (const product of productBatch) {
    promises.push(
      exabase.query(
        JSON.stringify({
          insert: product,
          table: "Product",
        })
      )
    ); //adjust parameters appropriately
  }

  await Promise.all(promises); //Ensure items populated before continuing tests within same scale to benchmark properly around same data for the tests. Sometimes certain caching effects might end up producing surprisingly discrepant results during a real workload especially across scale like from cold caches rather than subsequent attempts from recently accessed data involved.*
  console.log(
    "Created and initialized database, inserted ",
    numProducts,
    " products."
  );
}

const dataSizes = [1000, 10000, 100000]; // Dataset sizes to benchmarked. Vary to match scale constraints or expected scale bounds considered typical from deployments, otherwise most measures probably not particularly useful.*
const concurrencyLevels = [1, 10, 50];

const benchmarkFunctions = {
  insertOne: async (exabase: Exabase) => {
    let p = generateProducts(1)[0]; //Assumes function correctly implemented as in above where product schemas compatible
    await exabase.query(JSON.stringify({ table: "products", insert: p })); //Adjust API for call expected
  },

  //  Implement queries or aggregate-alike as according mongo api structure. For a test around simple query, test filter
  // Find using an indexed field

  findOne: async (exabase: Exabase) => {
    // Implement similar query like a "find" of single product for some filtering parameters
    await exabase.query(
      JSON.stringify({
        query: {
          find: "product",
          filter: { category: "Category 1", name: { $regex: /Product.*/ } },
        },
      })
    );
  },

  // Find across many (implement similar like mongo style equivalent.. )

  findMany: async (exabase: Exabase) => {
    let products = await exabase.query(
      JSON.stringify({ query: { find: "products" } })
    );

    // For measuring or performing operations matching specific types do or generate where relevant

    for (const p of products) {
      //Or loop over and inspect structure for compliance.*  Depending how fields stored certain database engines actually differ surprisingly much even around simply querying array fields to be able to iterate over those or filter relative to values contained using standard tools which may mean implementation and schema need to consider from early on even design to support appropriately and potentially could demand tradeoffs.*  For test such consideration normally less crucial.*
      if (!(p.category || p.price || p.name || p.description)) {
        //Verify format data populated according to format expected, otherwise modify. Add assertions here appropriately. For real queries add actual work according anticipated domain rather than dummy calls if useful to model that kind behavior..
        console.error("Missing expected schema value when checking sanity.", p);
      }
    }
  },

  //Update, example: update all with specific condition

  updateMany: async (exabase: Exabase) => {
    //Find, filter, update based on similar principles like an ecommerce product filtering routine where relevant.

    //Implement "update many query or matching logic. If supporting nested-objects implement queries within such for cases to simulate query types frequently encountered where data structure is not trivial single flat relation style such as using normalized approach.*

    await exabase.query(
      JSON.stringify({
        query: {
          update: "products",
          set: { $inc: { price: 1 } },
          filter: { category: "Category 1", name: { $regex: /Product.*/ } },
        },
      })
    );
  },
  //Implement further tests involving aggregation like structures to evaluate how that behavior changes across those data scales if queries involved as crucial measure intended, relative to use cases of target domains when those queries deemed representative. Aggregation types can affect business usage directly depending availability so it matters demonstrating viability as relevant or critical metric according domain when comparing similar query structures used elsewhere to gain adoption if insufficient compared or when needing specific properties not met reliably as compared to those already very common for the platform especially since this can create subtle issues otherwise where benchmark suggests useful from specific conditions encountered or from limited types but that engine's underlying behavior and principle used at design changes from test to test potentially in unpredictable fashion compared to other existing product where behavior of aggregation either documented and understood relatively precisely to some acceptable bound and with theoretical expectation as guarantee.

  //Implement "aggregateMany" ...
};

async function benchmarkForScale(
  exabase: Exabase,
  size: number,
  concurrency: number
) {
  const benchmarkResults: BenchmarkResult[] = [];

  //prepare the exabase

  await prepareDatabase(exabase, size);

  for (let name in benchmarkFunctions) {
    let op = benchmarkFunctions[name];

    let results = await runBenchmark(name, op, size, exabase, concurrency);

    benchmarkResults.push(results);
  }

  return benchmarkResults;
}

//Example performing test

// Measure benchmark across size. Do concurrently up to hardware permitting when running bench and aggregate together later via appropriate synchronization measure if doing from same node to prevent concurrent processes interfering and potentially generating misleading data.*

async function runAndMeasureAcrossDatasetSizeAndConcurrency() {
  let allBenchmarks = [];

  for (let size of dataSizes) {
    let benchmarksForScale: BenchmarkResult[] = [];
    for (let c of concurrencyLevels) {
      const exabase = new Exabase({}); //Create database here (or if mongo, use equivalent means appropriate to context). Important doing before loop of individual function benchmark tests.*
      exabase.query(
        JSON.stringify({
          table: "Product",
          induce: {
            name: "Product ",
            category: "Category ",
            price: Math.random(),
            description: "This is product ",
            reviews: [],
          },
        })
      );
      let results = await benchmarkForScale(exabase, size, c);
      benchmarksForScale = benchmarksForScale.concat(results); //Collect across the scales to record to a single output (assuming tests can proceed serially.*
    }
    allBenchmarks.push(benchmarksForScale);
  }

  writeBenchmarkToFile("benchmarks-ecommerce-like.txt", allBenchmarks.flat());
}

//Example writing report out as tab delimited file

const writeBenchmarkToFile = async (
  filename: string,
  results: BenchmarkResult[]
): Promise<void> => {
  try {
    let fileHandle = await fs.open(filename, "w");

    const headers = Object.keys(results[0]).join("\t") + "\n"; //Build string to record to file. Could add error metadata but adjust when needed

    await fileHandle.writeFile(headers);

    //Loop across results then create appropriate tab delimited outputs as formatted string

    for (const result of results) {
      let output = Object.values(results).join("\t") + "\n"; //Add others, format output.. handle failures
      await fileHandle.writeFile(output); //Output
    }

    await fileHandle.close();
  } catch (e) {
    console.log(e);
  } //Add handling appropriately
};

runAndMeasureAcrossDatasetSizeAndConcurrency();

bench("benchmark", () => {
  //
});

run();
