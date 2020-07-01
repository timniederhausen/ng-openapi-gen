import { SchemaObject, OpenAPIObject } from 'openapi3-ts';
import { EnumValue } from './enum-value';
import { GenType } from './gen-type';
import { tsComments, tsType, unqualifiedName } from './gen-utils';
import { Options } from './options';


/**
 * Context to generate a model
 */
export class Model extends GenType {

  // General type
  isSimple: boolean;
  isEnum: boolean;
  isObject: boolean;

  // Simple properties
  simpleType: string;
  enumValues: EnumValue[];

  constructor(public openApi: OpenAPIObject, name: string, public schema: SchemaObject, options: Options) {
    super(name, unqualifiedName, options);

    const description = schema.description || '';
    this.tsComments = tsComments(description, 0, schema.deprecated);

    const type = schema.type || 'any';

    // When enumStyle is 'alias' it is handled as a simple type.
    if (options.enumStyle !== 'alias' && (schema.enum || []).length > 0 && ['string', 'number', 'integer'].includes(type)) {
      const names = schema['x-enumNames'] as string[] || [];
      const values = schema.enum || [];
      this.enumValues = [];
      for (let i = 0; i < values.length; i++) {
        const enumValue = new EnumValue(type, names[i], values[i], options);
        this.enumValues.push(enumValue);
      }
    }

    this.isEnum = (this.enumValues || []).length > 0;
    this.isSimple = !this.isEnum;

    // Actual definition is formatted by tsType
    this.simpleType = tsType(schema, options);

    this.collectImports(schema);
    this.updateImports();
  }

  protected pathToModels(): string {
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

  protected skipImport(name: string): boolean {
    // Don't import own type
    return this.name === name;
  }
}
