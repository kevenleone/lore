- **Several things are created at import:**
  - `Secrets.get`
  - `TaskMonitor()`

  That's why nothing can be imported in tests.
- **Largest functions:**

  | Function | Approx. lines |
  |---|--:|
  | `stream_thread_func` | 1,580 |
  | `run_tool` (one `a \| b` chain) | 1,100 |

- Last item.
