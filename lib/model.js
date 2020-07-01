"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const enum_value_1 = require("./enum-value");
const gen_type_1 = require("./gen-type");
const gen_utils_1 = require("./gen-utils");
/**
 * Context to generate a model
 */
class Model extends gen_type_1.GenType {
    constructor(openApi, name, schema, options) {
        super(name, gen_utils_1.unqualifiedName, options);
        this.openApi = openApi;
        this.schema = schema;
        const description = schema.description || '';
        this.tsComments = gen_utils_1.tsComments(description, 0, schema.deprecated);
        const type = schema.type || 'any';
        // When enumStyle is 'alias' it is handled as a simple type.
        if (options.enumStyle !== 'alias' && (schema.enum || []).length > 0 && ['string', 'number', 'integer'].includes(type)) {
            const names = schema['x-enumNames'] || [];
            const values = schema.enum || [];
            this.enumValues = [];
            for (let i = 0; i < values.length; i++) {
                const enumValue = new enum_value_1.EnumValue(type, names[i], values[i], options);
                this.enumValues.push(enumValue);
            }
        }
        this.isEnum = (this.enumValues || []).length > 0;
        this.isSimple = !this.isEnum;
        // Actual definition is formatted by tsType
        this.simpleType = gen_utils_1.tsType(schema, options);
        this.collectImports(schema);
        this.updateImports();
    }
    pathToModels() {
        if (this.namespace) {
            const depth = this.namespace.split('/').length;
            let path = '';
            for (let i = 0; i < depth; i++) {
                path += '../';
            }
            return path;
        }
        return './';
    }
    skipImport(name) {
        // Don't import own type
        return this.name === name;
    }
}
exports.Model = Model;
//# sourceMappingURL=model.js.map