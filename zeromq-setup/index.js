import * as zmq from "zeromq";
class DistributedKVDB {
    store = {};
    publisher;
    subscriber;
    id; // Unique ID for this instance
    constructor(id, pubPort, subPorts) {
        this.id = id;
        this.publisher = new zmq.Publisher();
        this.subscriber = new zmq.Subscriber();
        // Bind publisher socket
        this.publisher.bind(`tcp://127.0.0.1:${pubPort}`).then(() => {
            console.log(`[${this.id}] Publisher bound to port ${pubPort}`);
        });
        // Connect subscriber to other nodes' publishers
        subPorts.forEach((port) => {
            if (port !== pubPort) {
                this.subscriber.connect(`tcp://127.0.0.1:${port}`);
                console.log(`[${this.id}] Subscribed to port ${port}`);
            }
        });
        // Subscribe to all messages
        this.subscriber.subscribe("");
        this.listenForUpdates();
    }
    // Write operation: Set a key-value pair
    async set(key, value) {
        this.store[key] = value;
        console.log(`[${this.id}] Set key "${key}" to "${value}"`);
        await this.publishUpdate(key, value);
    }
    // Read operation: Get the value for a key
    get(key) {
        return this.store[key];
    }
    // Publish updates to other nodes
    async publishUpdate(key, value) {
        const message = JSON.stringify({ key, value, sender: this.id });
        await this.publisher.send(message);
        console.log(`[${this.id}] Published update for key "${key}"`);
    }
    // Listen for updates from other nodes
    async listenForUpdates() {
        for await (const [msg] of this.subscriber) {
            const { key, value, sender } = JSON.parse(msg.toString());
            if (sender !== this.id) {
                this.store[key] = value;
                console.log(`[${this.id}] Received update: Set key "${key}" to "${value}" from "${sender}"`);
            }
        }
    }
}
// Example Usage
(async () => {
    // Instance A
    const dbA = new DistributedKVDB("A", 5555, [5555, 5556]);
    // Instance B
    const dbB = new DistributedKVDB("B", 5556, [5555, 5556]);
    // Simulate operations
    setTimeout(async () => {
        await dbA.set("key1", "value1");
    }, 1000);
    setTimeout(() => {
        console.log(`Instance B reads key1: ${dbB.get("key1")}`);
    }, 2000);
})();
