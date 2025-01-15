/** GlobalIndex for multiple xtree indexer files
 Involves in 
 3.- - - - global search index hashing
 4.- - - - concurrent global searching
 5. 
 */

class GlobalIndex {
  layers: {
    [log_file_name: string]: { [attr: string]: [min: number, max: number] };
  };
  async update(log_file_name: string, data: Record<string, any>) {
    for (const [attr, val] of Object.entries(data)) {
      const numerical_representation = numb(val.toString());
      const [min, max] = this.layers[log_file_name][attr];
      if (numerical_representation < min)
        this.layers[log_file_name][attr][0] = numerical_representation;
      if (numerical_representation > max)
        this.layers[log_file_name][attr][1] = numerical_representation;
    }
    await this.saveGlobalIndex();
  }
  searchFiles(data: Record<string, any>) {
    const files_within_range: string[] = [];
    const files = Object.keys(this.layers);
    for (const [attr, val] of Object.entries(data)) {
      for (let i = 0; i < files.length; i++) {
        const log_file_name = files[i];
        const numerical_representation = numb(val.toString());
        const [min, max] = this.layers[log_file_name][attr];
        if (max >= numerical_representation && numerical_representation <= min)
          files_within_range.push(log_file_name);
      }
    }
    return files_within_range;
  }
  async saveGlobalIndex() {
    // code save to disk using msgpack
  }
}

const numb = (str: string) => {
  let out = 0;
  for (let pos = 0, len = str.length; pos < len; pos++) {
    out += str.charCodeAt(pos);
  }
  return out;
};
