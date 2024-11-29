const path = require("path");

module.exports = {
  entry: "./rljson.js", // Entry point
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "rljson.min.js", // Output file
    library: "RLJSON", // Global variable name in browsers
    libraryTarget: "umd", // Support CommonJS, AMD, and global usage
  },
  mode: "production", // Minified output
};
