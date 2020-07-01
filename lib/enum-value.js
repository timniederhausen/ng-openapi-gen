"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsesc_1 = __importDefault(require("jsesc"));
const gen_utils_1 = require("./gen-utils");
/**
 * Represents a possible enumerated value
 */
class EnumValue {
    constructor(type, name, _value, options) {
        this.type = type;
        this.options = options;
        const value = String(_value);
        this.name = name || gen_utils_1.enumName(value, options);
        if (type === 'string') {
            this.value = `'${jsesc_1.default(value)}'`;
        }
        else {
            this.value = value;
        }
    }
}
exports.EnumValue = EnumValue;
//# sourceMappingURL=enum-value.js.map