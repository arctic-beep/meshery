---
layout: page
title: Contributing to Meshery Schemas
permalink: project/contributing/contributing-schemas
abstract: How to contribute to Meshery Schemas
language: en
type: project
category: contributing
list: include
---

## Overview
Meshery follows schema-driven development. As a project, Meshery has different types of schemas. Some schemas are external facing, and some internal to Meshery itself. This repository serves as a central location for storing schemas from which all Meshery components can take reference.

The schemas follow a versioned approach to maintain backward compatibility while allowing for the evolution of the definitions.

{% include alert.html type="info" title="Meshery Documentation Core Concepts" content="To better understand how schemas fit into Meshery's architecture, read about Meshery's core concepts in the <a href='https://docs.meshery.io/concepts/logical'>Meshery documentation</a>." %}

## Prerequisites
- **oapi-codegen**: This tool is essential for generating Go code from OpenAPI specifications. Install it using:
```bash
go install github.com/deepmap/oapi-codegen/cmd/oapi-codegen@latest
```
- **make**: The repository uses Makefiles to automate various tasks. Ensure you have make installed on your system.

## Development Workflow

### Schema Definition in Meshery
Meshery uses **OpenAPI v3** specification to define schemas. Given the complexity of the project, where multiple constructs and APIs exist, we adopt a structured approach to schema management:
- **Schemas are versioned** to maintain backward compatibility.
- **Schemas are modular** to support different components of Meshery independently.
- **Schemas are used for validation, API definition, and automatic code generation.**

### Schema Directory Structure
All schemas are stored in the **`schemas`** directory at the root of the project. The structure follows:

```
schemas/
  constructs/
    <schema-version>/               # e.g., v1beta1
      <construct>/                  # e.g., model, component
        <construct>.json            # Schema definition for the construct (noun)
        <construct>_template.json   # json template generated from schema
        <construct>_template.yaml   # yaml template generated from schema
        subschemas/                 # Any subschemas used within the construct
        openapi.yml                 # OpenAPI schema defining API operations (verbs like create, update, delete)
```

### Explanation
- **`constructs/`** – Contains schemas for different versions.
- **`<schema-version>/`** – Each schema version (e.g., `v1beta1`, `v1alpha2`) is a separate directory.
- **`<construct>/`** – Each construct (e.g., `capability`, `category`) has its own folder.
- **`<construct>.json`** – Defines the **schema for the noun** (i.e., the entity).
- **`<construct>_template.json`** - json template generated from schema. Valid json document generated from schema definition. Has all references resolved, contains default values.
- **`<construct>_template.yaml`** - yaml template generated from schema. Valid yaml document generated from schema definition. Has all references resolved, contains default values.
- **`subschemas/`** – Contains reusable subschemas for modularity.
- **`openapi.yml`** – Defines **API operations** (verbs: `create`, `update`, `delete`) and serves as the **entry point** for the schema.

This approach ensures that **schemas are well-organized, reusable, and scalable** across different Meshery components.

---

## Adding a New Schema
To add a new schema, follow these steps:
1. **Create a new directory** under `schemas/constructs/` for the new schema version.
2. **Create a new directory** for the construct under the version directory.
3. **Define the schema** in JSON format and save it as `<construct>.json`.
4. **Create a subschemas directory** if needed, and add any reusable subschemas.
5. **Define the OpenAPI schema** in `openapi.yml` to specify API operations.
6. **Update the `generate.sh` script** to include the new schema for code generation.
7. **Run the code generation script** to generate the necessary code files.

## Code Generation
Meshery supports **automatic code generation** for:
- **Golang** (structs and types)
- **TypeScript** (interfaces and types)
- **JSON template** (json document with default values)
- **YAML template** (yaml document with default values)

### Generating Code from Schemas
The schema-to-code mapping is defined in **`generate.sh`**, which automates the generation process.

### Generating Golang Models
To generate Go structs from schemas, use:
```bash
make golang-generate
```
This also generates a merged_openapi.yml file which can be used to generate the redoc documentation and for rtk-api

### Generating TypeScript Models, JSON and YAML templates
To generate
- TypeScript types
- json templates
- yaml templates

from schemas, use:
```bash
make generate-types
```

This will generate the typescript types, javascript objects for the schemas, json templates, yaml templates.
The javascript objects can be used to do run time validation of data or for getting information from the schema.

### Schema-to-Code Mapping
Example mapping in **`generate.sh`**:
```bash
generate_schema_models <construct> <schema-version>
generate_schema_models "capability" "v1alpha1"
generate_schema_models "category" "v1beta1"
generate_schema_models "component" "v1beta1"
generate_schema_models "pattern" "v1beta1" "schemas/constructs/v1beta1/design/openapi.yml"
generate_schema_models "core" "v1alpha1"
generate_schema_models "catalog" "v1alpha2"
```
- The **package name matches the construct name**.
- Example: For the `capability` construct in `v1alpha1`, the generated Go code will be in:
  ```
  models/v1alpha1/capability/capability.go
  ```

### Example Output
```bash
./generate-golang.sh
🔹 Processing: capability (v1alpha1)...
✅ Generated: models/v1alpha1/capability/capability.go
🔹 Processing: category (v1beta1)...
✅ Generated: models/v1beta1/category/category.go
🔹 Processing: pattern (v1beta1)...
✅ Generated: models/v1beta1/pattern/pattern.go
🔹 Processing: core (v1alpha1)...
✅ Generated: models/v1alpha1/core/core.go
🔹 Processing: catalog (v1alpha2)...
✅ Generated: models/v1alpha2/catalog/catalog.go
```

This ensures that schemas remain the **single source of truth**, making development **efficient, consistent, and scalable**.

## Real Contributor Scenarios: Schema in Action!
Schema-driven development can feel abstract until you are trying to implement something. Here are a few real world flows from different types of contributors. Whether you are building a new feature or just curious how others plug into schemas, this is the guide.

### 1. Mesheryctl Contributor Flow
**Example:** You want to add a `mesheryctl model build` command. 
**Steps:**
- Add the new verb in `openapi.yaml` under the appropriate construct (e.g., `model/`)
- Update `<construct>.json` if new properties are needed
- Run:
```bash 
make generate-types
make golang-generate 
```
- Implement the CLI logic
- Add tests (Check existing unit tests for format)

*Why it matters:* This keeps CLI behavior consistent with API behavior, thanks to schema as the source of truth.

### 2. Meshery Server Contributor Flow
**Example:** Add a new `status` field to `component`.
**Steps:**
- Add the new property in `component.json`
- Run:
```bash
make validate-schemas
make golang-generate
```
- The generated Go structs (from `oapi-codegen`) are used in the backend.
- If the backend uses GORM with auto-migration enabled, these structs may be used to update the DB schema.
- Avoid manually editing the generated models, as they will be overwritten when schemas are regenerated.

*Why it matters:* This reduces drift between backend logic and API contract.

### 3. Meshery UI Contributor Flow
**Example:** Show the new `version` field on the Model dashboard. 
**Steps:**
- Check `openapi.yaml` to verify the new field exists
- Wait for the backend to regenerate and expose the property
- Use RTK + TypeScript types to access and render data

> **Note**: `make generate-types` now generates only TypeScript types and schema-related objects. `_template.json` / `_template.yaml` files are no longer auto-generated.

*Why it matters:* UI stays in sync with the backend - fewer bugs, fewer mismatches, easier onboarding.

### 4. Meshery Docs Contributor Flow
**Example:** You are writing a guide!
**Steps:**
- Read the schema structure and workflows
- Walk through the scenarios above
- Write a guide that's accurate, actionable, and friendly

*Why it matters:* Docs are often the first impression contributors get. Schema-driven clarity starts here.

{% include alert.html type="warning" title="Best Practices" content="
  <ul>
    <li>Do not commit the entire output of <code>make build</code> unless you're intentionally updating all the generated schemas.</li>
    <li><strong>Verify that you're using the correct version</strong> of <code>@openapi-contrib/openapi-schema-to-json-schema</code>.</li>
    <li>Run <code>make generate-types</code> to validate your changes and check that only the intended files have been updated.</li>
  </ul>
  <p>Adhering to these practices keeps the repository clean, reduces noise in code reviews, and helps us maintain the schemas as the single source of truth.</p>" %}

## Getting Help
- [GitHub Issues](https://github.com/meshery/schemas/issues) - Report bugs or request features
- [Community Slack](https://slack.meshery.io) - Real-time discussions with maintainers
- [Weekly Meetings](https://meshery.io/calendar) - Join our community calls

---
> **Community Resources**
> For more contribution guidelines, see the [Meshery Contributing Guide](https://github.com/meshery/meshery/blob/master/CONTRIBUTING.md).
