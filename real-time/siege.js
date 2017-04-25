var siege = require('siege');

// siege()
//   .concurrent(200)
//   .get('/')
//   .attack()

siege()
  .host('localhost')
  .on(80)
  .concurrent(30)
  .for(10000).times
  .get('http://rt.besgam.com/index.html')
  .post('/')
  .attack()