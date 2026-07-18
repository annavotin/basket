const base = require('./app.json')

module.exports = {
  ...base,
  expo: {
    ...base.expo,
    extra: {
      posthogProjectToken: process.env.POSTHOG_PROJECT_TOKEN,
      posthogHost: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
    },
  },
}
