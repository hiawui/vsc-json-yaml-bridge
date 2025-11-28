# JSON YAML Bridge

A powerful VS Code extension that seamlessly converts between JSONL, JSON, and YAML formats. This tool bridges the gap between different data serialization formats, making it easier to work with logs, configuration files, and data dumps.

## Features

- **JSONL to YAML**: Convert JSON Lines (newline-delimited JSON) to readable YAML format.
- **JSON to YAML**: Convert standard JSON files or selections to YAML.
- **YAML to JSON**: Convert YAML files or selections to JSON format.
- **Smart Selection**: Works on selected text or the entire document if nothing is selected.
- **New File Output**: Saves the converted content to a new file (e.g., `.jv.yaml`) to preserve your original data.

## Usage

### Converting JSONL to YAML
1. Open a file containing JSONL data.
2. (Optional) Select specific lines to convert.
3. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`).
4. Run command: **Convert JSONL to YAML**.

### Converting JSON to YAML
1. Open a JSON file.
2. (Optional) Select the JSON object/array.
3. Open Command Palette.
4. Run command: **Convert JSON to YAML**.

### Converting YAML to JSON
1. Open a YAML file.
2. (Optional) Select the YAML content.
3. Open Command Palette.
4. Run command: **Convert YAML to JSON**.

## Examples

### JSONL to YAML
**Input (JSONL):**
```jsonl
{"name": "John", "age": 30, "city": "New York"}
{"name": "Jane", "age": 25, "city": "San Francisco"}
```

**Output (YAML):**
```yaml
- age: 30
  city: "New York"
  name: "John"
- age: 25
  city: "San Francisco"
  name: "Jane"
```

### JSON to YAML
**Input (JSON):**
```json
{
  "server": {
    "port": 8080,
    "host": "localhost"
  }
}
```

**Output (YAML):**
```yaml
server:
  port: 8080
  host: localhost
```

## Requirements

- VS Code version 1.74.0 or higher

## Installation

1. Search for "JSON YAML Bridge" in the VS Code Extension Marketplace.
2. Click Install.
   
OR

1. Clone this repository.
2. Run `npm install` to install dependencies.
3. Press `F5` to start debugging.

## License

BSD 3-Clause License
