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
  login() {}
}
