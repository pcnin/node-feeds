"use strict";

/**********************************************************/
/*                      Librerías                         */
/**********************************************************/
var http        = require("http"),
	zlib 		= require('zlib'),
	conf		= {
        /* Luckia */
        id: 17,
        name: 'luckia',
        host: 'luckiaxml.sbtech.com',
        protocol: 'http:',
        port: 80,
        headers: { 'Accept-Encoding': 'gzip,deflate' },
        path: '/livelines.aspx?OddsStyle=DECIMAL'
    };

var req = http.request( conf, getCallRequest );


function getCallRequest( res )
{
	var xml = '';

    res.on('data', (chunk) =>
    {
        xml += chunk;

  //       zlib.unzip(chunk, (err, buffer) => {
		// 	if (!err) 
		// 	{
		// 		 xml += buffer;
		// 	} else {
		// 		console.log( err );
		// 	}
		// });
    });

    res.on('end', () =>
    {
    	console.log( zlib.unzip(xml) );
    });
};

/* Terminamos la llamada */
req.end();
/* La llamada provoca un error */
req.on('error', (e) =>
{
    console.log( 'problem with request: %s', e.message );
});
/* El feed no responde en 5s */
req.setTimeout(10000, () =>
{
    console.log( 'Timeout' );
});
