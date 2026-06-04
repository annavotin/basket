const React = require('react')
const { View } = require('react-native')
// Manual mock for node_modules package — Jest picks this up automatically.
// Renders a View that forwards all props (including testID and onValueChange),
// so tests can fire `valueChange` on it.
module.exports = (props) => React.createElement(View, props)
