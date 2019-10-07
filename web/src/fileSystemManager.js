import * as BrowserFS from "browserfs";

import { randId, assert } from "./utils.js";

const ArrayBufferView = Object.getPrototypeOf(
  Object.getPrototypeOf(new Uint8Array())
).constructor;

export class FileSystemManager {
  constructor() {
    this.fs = null;
    this.path = null;
    this.buffer = null;
    this.api = {};
  }
  init() {
    return new Promise((resolve, reject) => {
      BrowserFS.configure(
        {
          fs: "MountableFileSystem",
          options: {
            "/tmp": { fs: "InMemory", options: { storeName: "tmp" } },
            "/home": { fs: "IndexedDB", options: { storeName: "home" } },
            // '/mnt/h5': { fs: "HTML5FS", options: {} }
          },
        },
        e => {
          if (e) {
            reject(e);
            return;
          }
          const _fs = BrowserFS.BFSRequire("fs");
          const buffer = BrowserFS.BFSRequire("buffer");

          //convert arraybuffer to Buffer
          var convert = function(fn) {
            return function() {
              const args = Array.prototype.slice.call(arguments);
              const newargs = [];
              for (let arg of args) {
                if (arg instanceof ArrayBuffer) {
                  newargs.push(buffer.Buffer(arg));
                } else if (arg instanceof ArrayBufferView) {
                  newargs.push(buffer.Buffer(arg.buffer));
                } else {
                  newargs.push(arg);
                }
              }
              return fn.apply(this, newargs);
            };
          };

          this.fs = {};
          for (let k in _fs) {
            this.fs[k] = convert(_fs[k]);
          }

          this.path = BrowserFS.BFSRequire("path");
          this.api = { fs: this.fs, path: this.path };

          resolve(this.fs);
        }
      );
    });
  }
  destroy() {}
}

export class FileManager {
  constructor({ event_bus = null, client_id = null }) {
    this.event_bus = event_bus;
    assert(this.event_bus);
    this.client_id = client_id || randId();
    this.fileManagers = [];
  }

  async init() {}

  getFileManagerByName(name) {
    for (let fm of this.fileManagers) {
      if (fm.name === name) {
        return fm;
      }
    }
    return null;
  }

  getFileManagerByUrl(url) {
    for (let fm of this.fileManagers) {
      if (fm.url === url) {
        return fm;
      }
    }
    return null;
  }

  register(manager) {
    for (let i = 0; i < this.fileManagers.length; i++) {
      if (this.fileManagers[i].name === manager.name) {
        this.fileManagers.splice(i, 1);
        break;
      }
    }
    manager.connected = true;
    this.fileManagers.push(manager);
  }

  unregister(manager) {
    const index = this.fileManagers.indexOf(manager);
    if (index > -1) {
      this.fileManagers.splice(index, 1);
    }
  }

  destroy() {
    for (let e of this.fileManagers) {
      e.destroy();
    }
  }
}
