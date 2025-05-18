export default {
    plugins: {
     '@tailwindcss/postcss': {
        config : './tailwind.config.js', // Path to your Tailwind CSS config file
     }, // Use core Tailwind CSS plugin
      autoprefixer: {},
    }
  }