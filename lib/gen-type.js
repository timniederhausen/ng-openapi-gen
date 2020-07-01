"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gen_utils_1 = require("./gen-utils");
const imports_1 = require("./imports");
/**
 * Base definitions of a generated type
 */
class GenType {
    constructor(name, typeNameTransform, 
    /** Generation options */
    options) {
        this.name = name;
        this.options = options;
        this._additionalDependencies = new Set();
        this.typeName = typeNameTransform(name, options);
        this.namespace = gen_utils_1.namespace(name);
        this.fileName = gen_utils_1.fileName(this.typeName);
        this.qualifiedName = this.typeName;
        if (this.namespace) {
            this.fileName = this.namespace + '/' + this.fileName;
            this.qualifiedName = gen_utils_1.typeName(this.namespace) + this.typeName;
        }
        this._imports = new imports_1.Imports(options);
    }
    addImport(name) {
        if (!this.skipImport(name)) {
            // Don't have to import to this own file
            this._imports.add(name, this.pathToModels());
        }
    }
    updateImports() {
        this.imports = this._imports.toArray();
        this.additionalDependencies = [...this._additionalDependencies];
    }
    collectImports(schema, additional = false, processOneOf = false) {
        if (!schema) {
            return;
        }
        else if (schema.$ref) {
            const dep = gen_utils_1.simpleName(schema.$ref);
            if (additional) {
                this._additionalDependencies.add(dep);
            }
            else {
                this.addImport(dep);
            }
        }
        else {
            schema = schema;
            (schema.oneOf || []).forEach(i => this.collectImports(i, additional));
            (schema.allOf || []).forEach(i => this.collectImports(i, additional));
            (schema.anyOf || []).forEach(i => this.collectImports(i, additional));
            if (processOneOf) {
                (schema.oneOf || []).forEach(i => this.collectImports(i, additional));
            }
            if (schema.items) {
                this.collectImports(schema.items, additional);
            }
            if (schema.properties) {
                const properties = schema.properties;
                Object.keys(properties).forEach(p => {
                    const prop = properties[p];
                    this.collectImports(prop, additional, true);
                });
            }
            if (typeof schema.additionalProperties === 'object') {
                this.collectImports(schema.additionalProperties, additional);
            }
        }
    }
}
exports.GenType = GenType;
//# sourceMappingURL=gen-type.js.map