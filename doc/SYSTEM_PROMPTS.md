# System Prompts

System prompt presets are configured in `public/system-prompts.json`.

Each entry:
- `id`: unique string
- `name`: label shown in the Text Models node
- `prompt`: the system prompt text sent to the model

Example:
```json
[
  { "id": "default", "name": "Default", "prompt": "You are a helpful assistant." }
]
```
