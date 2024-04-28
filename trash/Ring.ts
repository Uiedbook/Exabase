class Ring {
  state: boolean;
  url: string;
  tables: string[];
  connected: boolean = false;
  constructor({ state, url, tables }) {
    this.state = state;
    this.url = url;
    this.tables = tables;
  }
  hydrate() {}
  broadcast() {}
  send_state() {}
  new_sync_data() {}
  login(ringConfig: {}) {
    console.log("boohoo");
  }

  static decode_timestamp = (timestamp: string): string => {
    return new Date(parseInt(timestamp, 16) * 1000).toString();
  };
}
