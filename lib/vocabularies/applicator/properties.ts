import type {CodeKeywordDefinition} from "../../types"
import KeywordCxt from "../../compile/context"
import {_, getProperty, Name} from "../../compile/codegen"
import {propertyInData, allSchemaProperties} from "../code"
import {alwaysValidSchema, toHash} from "../../compile/util"
import apDef from "./additionalProperties"

const def: CodeKeywordDefinition = {
  keyword: "properties",
  type: "object",
  schemaType: "object",
  code(cxt: KeywordCxt) {
    const {gen, schema, parentSchema, data, it} = cxt
    if (it.opts.removeAdditional === "all" && parentSchema.additionalProperties === undefined) {
      apDef.code(new KeywordCxt(it, apDef, "additionalProperties"))
    }
    const allProps = allSchemaProperties(schema)
    addEvaluatedProps(allProps)
    const properties = allProps.filter((p) => !alwaysValidSchema(it, schema[p]))
    if (properties.length === 0) return
    const valid = gen.name("valid")

    for (const prop of properties) {
      if (hasDefault(prop)) {
        applyPropertySchema(prop)
      } else {
        gen.if(propertyInData(data, prop, it.opts.ownProperties))
        applyPropertySchema(prop)
        if (!it.allErrors) gen.else().var(valid, true)
        gen.endIf()
      }
      cxt.ok(valid)
    }

    function addEvaluatedProps(ps: string[]): void {
      const {props} = it
      if (props === true) return
      if (props instanceof Name) {
        gen.if(_`${props} !== true`, () =>
          ps.forEach((p) => gen.assign(_`${props}${getProperty(p)}`, true))
        )
        return
      }
      it.props = props === undefined ? toHash(ps) : {...props, ...toHash(ps)}
    }

    function hasDefault(prop: string): boolean | undefined {
      return it.opts.useDefaults && !it.compositeRule && schema[prop].default !== undefined
    }

    function applyPropertySchema(prop: string): void {
      cxt.subschema(
        {
          keyword: "properties",
          schemaProp: prop,
          dataProp: prop,
          strictSchema: it.strictSchema,
        },
        valid
      )
    }
  },
}

export default def
