export default () => ({
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  upload: {
    destination: process.env.UPLOAD_DESTINATION || './uploads',
  },
});
