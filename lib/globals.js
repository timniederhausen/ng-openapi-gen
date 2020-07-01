"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gen_utils_1 = require("./gen-utils");
/**
 * Stores the global variables used on generation
 */
class Globals {
    constructor(options) {
        this.configurationClass = options.configuration || 'ApiConfiguration';
        this.configurationFile = gen_utils_1.fileName(this.configurationClass);
        this.configurationParams = `${this.configurationClass}Params`;
        this.baseServiceClass = options.baseService || 'BaseService';
        this.baseServiceFile = gen_utils_1.fileName(this.baseServiceClass);
        this.requestBuilderClass = options.requestBuilder || 'RequestBuilder';
        this.requestBuilderFile = gen_utils_1.fileName(this.requestBuilderClass);
        this.responseClass = options.response || 'StrictHttpResponse';
        this.responseFile = gen_utils_1.fileName(this.responseClass);
        if (options.module !== false && options.module !== '') {
            this.moduleClass = options.module === true || options.module == undefined ? 'ApiModule' : options.module;
            // Angular's best practices demands xxx.module.ts, not xxx-module.ts
            this.moduleFile = gen_utils_1.fileName(this.moduleClass).replace(/\-module$/, '.module');
        }
        if (options.serviceIndex !== false && options.serviceIndex !== '') {
            this.serviceIndexFile = options.serviceIndex === true || options.serviceIndex == undefined ? 'services' : options.serviceIndex;
        }
        if (options.modelIndex !== false && options.modelIndex !== '') {
            this.modelIndexFile = options.modelIndex === true || options.modelIndex == undefined ? 'models' : options.modelIndex;
        }
    }
}
exports.Globals = Globals;
//# sourceMappingURL=globals.js.map