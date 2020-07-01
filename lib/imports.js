"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gen_utils_1 = require("./gen-utils");
class Import {
    constructor(name, pathToModels, options) {
        this.name = name;
        this.typeName = gen_utils_1.unqualifiedName(name, options);
        this.qualifiedName = gen_utils_1.qualifiedName(name, options);
        this.useAlias = this.typeName !== this.qualifiedName;
        this.file = gen_utils_1.modelFile(pathToModels, name, options);
    }
}
exports.Import = Import;
/**
 * Manages the model imports to be added to a generated file
 */
class Imports {
    constructor(options) {
        this.options = options;
        this._imports = new Map();
    }
    /**
     * Adds an import
     */
    add(name, pathToModels) {
        this._imports.set(name, new Import(name, pathToModels, this.options));
    }
    toArray() {
        const keys = [...this._imports.keys()];
        keys.sort();
        return keys.map(k => this._imports.get(k));
    }
}
exports.Imports = Imports;
//# sourceMappingURL=imports.js.map