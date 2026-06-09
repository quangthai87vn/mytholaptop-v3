/**
 * Fix the double closing paren in the SQL file
 */
const fs = require("fs");
const path = require("path");
const sqlPath = path.join(__dirname, "..", "sql", "workspace", "021_admin_users_role_intern.sql");
let content = fs.readFileSync(sqlPath, "utf8");
console.log("Before fix, last line:", content.split("\n").slice(-3).join("\n"));
content = content.replace(/intern'\)\);/g, "intern');");
console.log("After fix, last line:", content.split("\n").slice(-3).join("\n"));
fs.writeFileSync(sqlPath, content, "utf8");
console.log("Fixed!");
