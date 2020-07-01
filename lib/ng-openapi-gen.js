"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const json_schema_ref_parser_1 = __importDefault(require("json-schema-ref-parser"));
const mkdirp_1 = __importDefault(require("mkdirp"));
const path_1 = __importDefault(require("path"));
const cmd_args_1 = require("./cmd-args");
const gen_utils_1 = require("./gen-utils");
const globals_1 = require("./globals");
const imports_1 = require("./imports");
const model_1 = require("./model");
const operation_1 = require("./operation");
const service_1 = require("./service");
const templates_1 = require("./templates");
/**
 * Main generator class
 */
class NgOpenApiGen {
    constructor(openApi, options) {
        this.openApi = openApi;
        this.options = options;
        this.models = new Map();
        this.services = new Map();
        this.operations = new Map();
        this.outDir = this.options.output || 'src/app/api';
        // Make sure the output path doesn't end with a slash
        if (this.outDir.endsWith('/') || this.outDir.endsWith('\\')) {
            this.outDir = this.outDir.substr(0, this.outDir.length - 1);
        }
        this.tempDir = this.outDir + '$';
        this.readTemplates();
        this.readModels();
        this.readServices();
        // Ignore the unused models if not set to false in options
        if (this.options.ignoreUnusedModels !== false) {
            this.ignoreUnusedModels();
        }
    }
    /**
     * Actually generates the files
     */
    generate() {
        // Make sure the temporary directory is empty before starting
        gen_utils_1.deleteDirRecursive(this.tempDir);
        fs_extra_1.default.mkdirsSync(this.tempDir);
        try {
            // Generate each model
            const models = [...this.models.values()];
            for (const model of models) {
                this.write('model', model, model.fileName, 'models');
            }
            // Generate each service
            const services = [...this.services.values()];
            for (const service of services) {
                this.write('service', service, service.fileName, 'services');
            }
            // Context object passed to general templates
            const general = {
                services: services,
                models: models
            };
            // Generate the general files
            this.write('configuration', general, this.globals.configurationFile);
            this.write('response', general, this.globals.responseFile);
            this.write('requestBuilder', general, this.globals.requestBuilderFile);
            this.write('baseService', general, this.globals.baseServiceFile);
            if (this.globals.moduleClass && this.globals.moduleFile) {
                this.write('module', general, this.globals.moduleFile);
            }
            const modelImports = this.globals.modelIndexFile || this.options.indexFile
                ? models.map(m => new imports_1.Import(m.name, './models', m.options)) : null;
            if (this.globals.modelIndexFile) {
                this.write('modelIndex', Object.assign(Object.assign({}, general), { modelImports }), this.globals.modelIndexFile);
            }
            if (this.globals.serviceIndexFile) {
                this.write('serviceIndex', general, this.globals.serviceIndexFile);
            }
            if (this.options.indexFile) {
                this.write('index', Object.assign(Object.assign({}, general), { modelImports }), 'index');
            }
            // Now synchronize the temp to the output folder
            gen_utils_1.syncDirs(this.tempDir, this.outDir, this.options.removeStaleFiles !== false);
            console.info(`Generation from ${this.options.input} finished with ${models.length} models and ${services.length} services.`);
        }
        finally {
            // Always remove the temporary directory
            gen_utils_1.deleteDirRecursive(this.tempDir);
        }
    }
    write(template, model, baseName, subDir) {
        const ts = this.templates.apply(template, model);
        const file = path_1.default.join(this.tempDir, subDir || '.', `${baseName}.ts`);
        const dir = path_1.default.dirname(file);
        mkdirp_1.default.sync(dir);
        fs_extra_1.default.writeFileSync(file, ts, { encoding: 'utf-8' });
    }
    readTemplates() {
        const hasLib = __dirname.endsWith(path_1.default.sep + 'lib');
        const builtInDir = path_1.default.join(__dirname, hasLib ? '../templates' : 'templates');
        const customDir = this.options.templates || '';
        this.globals = new globals_1.Globals(this.options);
        this.globals.rootUrl = this.readRootUrl();
        this.templates = new templates_1.Templates(builtInDir, customDir);
        this.templates.setGlobals(this.globals);
    }
    readRootUrl() {
        if (!this.openApi.servers || this.openApi.servers.length === 0) {
            return '';
        }
        const server = this.openApi.servers[0];
        let rootUrl = server.url;
        if (rootUrl == null || rootUrl.length === 0) {
            return '';
        }
        const vars = server.variables || {};
        for (const key of Object.keys(vars)) {
            const value = String(vars[key].default);
            rootUrl = rootUrl.replace(`{${key}}`, value);
        }
        return rootUrl;
    }
    readModels() {
        const schemas = (this.openApi.components || {}).schemas || {};
        for (const name of Object.keys(schemas)) {
            const schema = schemas[name];
            const model = new model_1.Model(this.openApi, name, schema, this.options);
            this.models.set(name, model);
        }
    }
    readServices() {
        const defaultTag = this.options.defaultTag || 'Api';
        // First read all operations, as tags are by operation
        const operationsByTag = new Map();
        for (const opPath of Object.keys(this.openApi.paths)) {
            const pathSpec = this.openApi.paths[opPath];
            for (const method of gen_utils_1.HTTP_METHODS) {
                const methodSpec = pathSpec[method];
                if (methodSpec) {
                    let id = methodSpec.operationId;
                    if (id) {
                        // Make sure the id is valid
                        id = gen_utils_1.methodName(id);
                    }
                    else {
                        // Generate an id
                        id = gen_utils_1.methodName(`${opPath}.${method}`);
                        console.warn(`Operation '${opPath}.${method}' didn't specify an 'operationId'. Assuming '${id}'.`);
                    }
                    if (this.operations.has(id)) {
                        // Duplicated id. Add a suffix
                        let suffix = 0;
                        let newId = id;
                        while (this.operations.has(newId)) {
                            newId = `${id}_${++suffix}`;
                        }
                        console.warn(`Duplicate operation id '${id}'. Assuming id ${newId} for operation '${opPath}.${method}'.`);
                        id = newId;
                    }
                    const operation = new operation_1.Operation(this.openApi, opPath, pathSpec, method, id, methodSpec, this.options);
                    // Set a default tag if no tags are found
                    if (operation.tags.length === 0) {
                        console.warn(`No tags set on operation '${opPath}.${method}'. Assuming '${defaultTag}'.`);
                        operation.tags.push(defaultTag);
                    }
                    for (const tag of operation.tags) {
                        let operations = operationsByTag.get(tag);
                        if (!operations) {
                            operations = [];
                            operationsByTag.set(tag, operations);
                        }
                        operations.push(operation);
                    }
                    // Store the operation
                    this.operations.set(id, operation);
                }
            }
        }
        // Then create a service per operation, as long as the tag is included
        const includeTags = this.options.includeTags || [];
        const excludeTags = this.options.excludeTags || [];
        const tags = this.openApi.tags || [];
        for (const tagName of operationsByTag.keys()) {
            if (includeTags.length > 0 && !includeTags.includes(tagName)) {
                console.debug(`Ignoring tag ${tagName} because it is not listed in the 'includeTags' option`);
                continue;
            }
            if (excludeTags.length > 0 && excludeTags.includes(tagName)) {
                console.debug(`Ignoring tag ${tagName} because it is listed in the 'excludeTags' option`);
                continue;
            }
            const operations = operationsByTag.get(tagName) || [];
            const tag = tags.find(t => t.name === tagName) || { name: tagName };
            const service = new service_1.Service(tag, operations, this.options);
            this.services.set(tag.name, service);
        }
    }
    ignoreUnusedModels() {
        // First, collect all type names used by services
        const usedNames = new Set();
        for (const service of this.services.values()) {
            for (const imp of service.imports) {
                usedNames.add(imp.name);
            }
            for (const imp of service.additionalDependencies) {
                usedNames.add(imp);
            }
        }
        // Collect dependencies on models themselves
        const referencedModels = Array.from(usedNames);
        usedNames.clear();
        referencedModels.forEach(name => this.collectDependencies(name, usedNames));
        // Then delete all unused models
        for (const model of this.models.values()) {
            if (!usedNames.has(model.name)) {
                console.debug(`Ignoring model ${model.name} because it is not used anywhere`);
                this.models.delete(model.name);
            }
        }
    }
    collectDependencies(name, usedNames) {
        const model = this.models.get(name);
        if (!model || usedNames.has(model.name)) {
            return;
        }
        // Add the model name itself
        usedNames.add(model.name);
        // Then find all referenced names and recurse
        this.allReferencedNames(model.schema).forEach(n => this.collectDependencies(n, usedNames));
    }
    allReferencedNames(schema) {
        if (!schema) {
            return [];
        }
        if (schema.$ref) {
            return [gen_utils_1.simpleName(schema.$ref)];
        }
        schema = schema;
        const result = [];
        (schema.allOf || []).forEach(s => Array.prototype.push.apply(result, this.allReferencedNames(s)));
        (schema.anyOf || []).forEach(s => Array.prototype.push.apply(result, this.allReferencedNames(s)));
        (schema.oneOf || []).forEach(s => Array.prototype.push.apply(result, this.allReferencedNames(s)));
        if (schema.properties) {
            for (const prop of Object.keys(schema.properties)) {
                Array.prototype.push.apply(result, this.allReferencedNames(schema.properties[prop]));
            }
        }
        if (typeof schema.additionalProperties === 'object') {
            Array.prototype.push.apply(result, this.allReferencedNames(schema.additionalProperties));
        }
        if (schema.items) {
            Array.prototype.push.apply(result, this.allReferencedNames(schema.items));
        }
        return result;
    }
}
exports.NgOpenApiGen = NgOpenApiGen;
///////////////////////////////////////////////////////////////////////////
/**
 * Parses the command-line arguments, reads the configuration file and run the generation
 */
function runNgOpenApiGen() {
    return __awaiter(this, void 0, void 0, function* () {
        const options = cmd_args_1.parseOptions();
        const refParser = new json_schema_ref_parser_1.default();
        const input = options.input;
        try {
            const openApi = yield refParser.bundle(input, {
                dereference: {
                    circular: false
                },
                resolve: {
                    http: {
                        timeout: options.fetchTimeout == null ? 20000 : options.fetchTimeout
                    }
                }
            });
            const gen = new NgOpenApiGen(openApi, options);
            gen.generate();
        }
        catch (err) {
            console.error(`Error on API generation from ${input}: ${err}`);
            process.exit(1);
        }
    });
}
exports.runNgOpenApiGen = runNgOpenApiGen;
//# sourceMappingURL=ng-openapi-gen.js.map