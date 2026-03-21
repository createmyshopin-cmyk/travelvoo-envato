/** Remove `.next` so `next dev` is not mixed with a previous `next build` output. */
const fs = require("fs");
const path = require("path");
const nextDir = path.join(__dirname, "..", ".next");
if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log("Removed .next");
}
