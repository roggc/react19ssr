const path = require("path");
const ReactServerWebpackPlugin = require("react-server-dom-webpack/plugin");

module.exports = {
  mode: "development",
  entry: [path.resolve(__dirname, "./setup/client.jsx")],
  output: {
    path: path.resolve(__dirname, "./public"),
    filename: "main.js",
    publicPath: "/",
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              ["@babel/preset-react", { runtime: "automatic" }],
              "@babel/preset-typescript",
            ],
            plugins: ["@babel/plugin-transform-modules-commonjs"],
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [new ReactServerWebpackPlugin({ isServer: false })],
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"],
  },
};
