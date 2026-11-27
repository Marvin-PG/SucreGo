import app from "./app.js";
import { parseApiPort } from "./config/env.js";

const port = parseApiPort();

app.listen(port, () => {
  console.info(`SucreGo API listening on http://localhost:${port}`);
});
