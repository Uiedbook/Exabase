import {
  unlinkSync,
  realpath,
  stat,
  open,
  write,
  fsync,
  close,
  chown as _chown,
  chmod,
  rename,
  unlink,
} from "fs";
import MurmurHash3 from "imurmurhash";
import { onExit } from "signal-exit";
import { resolve as _resolve } from "path";
import { promisify } from "util";
const activeFiles = {};

let invocations = 0;
function getTmpname(filename) {
  return (
    filename +
    "." +
    MurmurHash3(__filename)
      .hash(String(process.pid))
      .hash(String(++invocations))
      .result()
  );
}

function cleanupOnExit(tmpfile) {
  return () => {
    try {
      unlinkSync(typeof tmpfile === "function" ? tmpfile() : tmpfile);
    } catch {
      // ignore errors
    }
  };
}

function serializeActiveFile(absoluteName) {
  return new Promise((resolve) => {
    // make a queue if it doesn't already exist
    if (!activeFiles[absoluteName]) {
      activeFiles[absoluteName] = [];
    }

    activeFiles[absoluteName].push(resolve); // add this job to the queue
    if (activeFiles[absoluteName].length === 1) {
      resolve(undefined);
    } // kick off the first one
  });
}

// https://github.com/isaacs/node-graceful-fs/blob/master/polyfills.js#L315-L342
function isChownErrOk(err) {
  if (err.code === "ENOSYS") {
    return true;
  }

  const nonroot = !process.getuid || process.getuid() !== 0;
  if (nonroot) {
    if (err.code === "EINVAL" || err.code === "EPERM") {
      return true;
    }
  }

  return false;
}

async function SynFileWrit(filename: string, data?: any) {
  let fd;
  let tmpfile;
  let mode;
  let chown;
  /* istanbul ignore next -- The closure only gets called when onExit triggers */
  const removeOnExitHandler = onExit(cleanupOnExit(() => tmpfile));
  const absoluteName = _resolve(filename);

  try {
    await serializeActiveFile(absoluteName);
    const truename = await promisify(realpath)(filename).catch(() => filename);
    tmpfile = getTmpname(truename);

    // Either mode or chown is not explicitly set
    // Default behavior is to copy it from original file
    const stats = await promisify(stat)(truename).catch(() => {});
    if (stats) {
      if (mode == null) {
        mode = stats.mode;
      }

      if (chown == null && process.getuid) {
        chown = { uid: stats.uid, gid: stats.gid };
      }
    }

    fd = await promisify(open)(tmpfile, "w", mode);

    if (ArrayBuffer.isView(data)) {
      //  @ts-ignore
      await promisify(write)(fd, data, 0, data.length, 0);
    } else if (data != null) {
      //  @ts-ignore
      await promisify(write)(fd, String(data), 0, "utf8");
    }

    await promisify(fsync)(fd);

    await promisify(close)(fd);

    fd = null;

    if (chown) {
      await promisify(_chown)(tmpfile, chown.uid, chown.gid).catch((err) => {
        if (!isChownErrOk(err)) {
          throw err;
        }
      });
    }

    if (mode) {
      await promisify(chmod)(tmpfile, mode).catch((err) => {
        if (!isChownErrOk(err)) {
          throw err;
        }
      });
    }

    await promisify(rename)(tmpfile, truename);
  } finally {
    if (fd) {
      await promisify(close)(fd).catch(
        /* istanbul ignore next */
        () => {}
      );
    }
    removeOnExitHandler();
    await promisify(unlink)(tmpfile).catch(() => {});
    activeFiles[absoluteName].shift(); // remove the element added by serializeSameFile
    if (activeFiles[absoluteName].length > 0) {
      activeFiles[absoluteName][0](); // start next job if one is pending
    } else {
      delete activeFiles[absoluteName];
    }
  }
}
