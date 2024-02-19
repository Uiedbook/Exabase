class Ring {
  state: boolean;
  url: string;
  tables: string[];
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
    console.log("boohoo")
  }
  static encode_timestamp = (timestamp: string): string => {
    const time = ~~(new Date(timestamp).getTime() / 1000);
    
    buffer[3] = time & 0xff;
    buffer[2] = (time >> 8) & 0xff;
    buffer[1] = (time >> 16) & 0xff;
    buffer[0] = (time >> 24) & 0xff;
    return buffer.toString("hex");
  };
  static decode_timestamp = (timestamp: string): string => {
    return new Date(parseInt(timestamp, 16) * 1000).toString();
  };
}
