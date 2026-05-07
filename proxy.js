const https = require("https");
const http = require("http");

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Snowflake-Authorization-Token-Type, Accept, X-Snowflake-Account");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  if (req.method !== "POST") { res.writeHead(405); res.end(JSON.stringify({ error: "Only POST allowed" })); return; }

  var account = req.headers["x-snowflake-account"];
  if (!account) { res.writeHead(400); res.end(JSON.stringify({ error: "Missing X-Snowflake-Account header" })); return; }

  var body = "";
  req.on("data", function(chunk) { body += chunk; });
  req.on("end", function() {
    var options = {
      hostname: account + ".snowflakecomputing.com",
      path: "/api/v2/statements",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": req.headers["authorization"] || "",
        "X-Snowflake-Authorization-Token-Type": req.headers["x-snowflake-authorization-token-type"] || "KEYPAIR_JWT",
        "Accept": "application/json",
        "Content-Length": Buffer.byteLength(body)
      }
    };

    var sfReq = https.request(options, function(sfRes) {
      var data = "";
      sfRes.on("data", function(chunk) { data += chunk; });
      sfRes.on("end", function() {
        res.writeHead(sfRes.statusCode, { "Content-Type": "application/json" });
        res.end(data);
      });
    });

    sfReq.on("error", function(e) { res.writeHead(502); res.end(JSON.stringify({ error: e.message })); });
    sfReq.write(body);
    sfReq.end();
  });
}).listen(PORT, function() {
  console.log("Snowflake proxy running on port " + PORT);
});
