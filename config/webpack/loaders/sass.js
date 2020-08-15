module.exports = {
  test: /\.s[ac]ss$/i,
  exclude: /node_modules/,
  use: [{
    loader: 'sass-loader'
  }]
}
